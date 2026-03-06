import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Alert from '@/models/Alert';
import Stock from '@/models/Stock';
import NotificationConfig from '@/models/NotificationConfig';
import { fetchStockPrice } from '@/lib/stock-api';
import { calculateAveragePrice } from '@/lib/utils';
import { sendEmail, buildAlertEmailHTML } from '@/lib/notifications/email';
import { sendLineMessage, buildAlertLineMessage } from '@/lib/notifications/line';
import { IAlert, Market } from '@/types';

/**
 * 判斷目前時間是否在該市場的交易時段內
 * 台股：週一至週五 09:00–13:30 (UTC+8)
 * 美股：週一至週五，考慮延長交易時段 04:00–20:00 ET (盤前+盤後)
 *       換算 UTC+8 約為 17:00–隔日 09:00（冬令）/ 16:00–隔日 08:00（夏令）
 *       為簡化，我們在 UTC+8 的 15:00–隔日 10:00 之間都視為美股活躍時段
 */
function isMarketActive(market: Market): boolean {
  const now = new Date();
  // 轉換為 UTC+8 (台灣時間)
  const utc8Offset = 8 * 60; // minutes
  const localOffset = now.getTimezoneOffset(); // minutes (negative for east)
  const utc8Time = new Date(now.getTime() + (localOffset + utc8Offset) * 60 * 1000);

  const day = utc8Time.getDay(); // 0=Sun, 6=Sat
  const hours = utc8Time.getHours();
  const minutes = utc8Time.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (market === 'TW') {
    // 台股：週一至週五 08:30–13:45（含盤前盤後緩衝）
    if (day === 0 || day === 6) return false;
    return timeInMinutes >= 8 * 60 + 30 && timeInMinutes <= 13 * 60 + 45;
  }

  if (market === 'US') {
    // 美股（含盤前盤後）：UTC+8 約 15:00～隔日 07:00
    // 考慮夏令/冬令差異，放寬為 15:00～09:00
    // 週一的美股交易對應 UTC+8 的週二凌晨，所以邏輯稍複雜
    // 簡化：只要不是週六全天和週日 09:00 前，都允許檢查
    if (day === 6) return false; // 週六完全休息
    if (day === 0 && timeInMinutes < 5 * 60) return true; // 週日凌晨=週六美股盤後
    if (day === 0) return false; // 週日白天休息

    // 週一至週五：15:00 之後是美股時段
    if (timeInMinutes >= 15 * 60) return true;
    // 00:00–09:00 是前一天美股的盤後/延長交易
    if (timeInMinutes <= 9 * 60) return true;

    return false;
  }

  return true;
}

export async function GET() {
  try {
    await connectDB();

    const activeAlerts = await Alert.find({ isActive: true }).lean() as IAlert[];

    if (activeAlerts.length === 0) {
      return NextResponse.json({ message: 'No active alerts', triggered: 0 });
    }

    const notificationConfig = await NotificationConfig.findOne({}).lean();
    let triggeredCount = 0;
    const skippedMarkets: string[] = [];

    for (const alert of activeAlerts) {
      try {
        // 檢查市場是否在交易時段
        if (!isMarketActive(alert.market as Market)) {
          if (!skippedMarkets.includes(alert.market)) {
            skippedMarkets.push(alert.market);
          }
          continue;
        }

        // 檢查是否已達到最大觸發次數
        if (alert.maxTriggers > 0 && (alert.triggerCount || 0) >= alert.maxTriggers) {
          // 自動停用
          await Alert.findByIdAndUpdate(alert._id, { isActive: false });
          continue;
        }

        const price = await fetchStockPrice(alert.stockSymbol, alert.market as Market);
        if (!price) {
          console.log(`[Alert] Could not fetch price for ${alert.market}:${alert.stockSymbol}`);
          continue;
        }

        const stock = await Stock.findOne({ symbol: alert.stockSymbol, market: alert.market }).lean();
        const avgPrice = stock ? calculateAveragePrice(stock.purchases) : 0;

        let shouldTrigger = false;

        switch (alert.type) {
          case 'above_price':
            shouldTrigger = price.currentPrice >= alert.targetValue;
            break;
          case 'below_price':
            shouldTrigger = price.currentPrice <= alert.targetValue;
            break;
          case 'above_avg_percent':
            shouldTrigger = avgPrice > 0 && ((price.currentPrice - avgPrice) / avgPrice) * 100 >= alert.targetValue;
            break;
          case 'below_avg_percent':
            shouldTrigger = avgPrice > 0 && ((avgPrice - price.currentPrice) / avgPrice) * 100 >= alert.targetValue;
            break;
        }

        if (shouldTrigger) {
          // Cooldown: 同一警報 30 分鐘內不重複觸發
          if (alert.lastTriggered) {
            const lastTriggeredTime = new Date(alert.lastTriggered).getTime();
            if (Date.now() - lastTriggeredTime < 30 * 60 * 1000) continue;
          }

          const newTriggerCount = (alert.triggerCount || 0) + 1;

          // Send notifications
          if (notificationConfig) {
            if (alert.notifyChannels.includes('email') && notificationConfig.email?.enabled) {
              const html = buildAlertEmailHTML(
                alert.stockName,
                alert.stockSymbol,
                price.currentPrice,
                alert.type,
                alert.targetValue,
                alert.market
              );
              await sendEmail(
                {
                  smtpHost: notificationConfig.email.smtpHost,
                  smtpPort: notificationConfig.email.smtpPort,
                  smtpUser: notificationConfig.email.smtpUser,
                  smtpPass: notificationConfig.email.smtpPass,
                },
                {
                  to: notificationConfig.email.recipients,
                  subject: `股票警報: ${alert.stockName} (${alert.stockSymbol}) [${newTriggerCount}/${alert.maxTriggers || '∞'}]`,
                  html,
                }
              );
            }

            if (alert.notifyChannels.includes('line') && notificationConfig.line?.enabled) {
              const message = buildAlertLineMessage(
                alert.stockName,
                alert.stockSymbol,
                price.currentPrice,
                alert.type,
                alert.targetValue,
                alert.market
              );
              await sendLineMessage(
                { channelAccessToken: notificationConfig.line.channelAccessToken },
                {
                  userIds: notificationConfig.line.recipients.map((r: { userId: string }) => r.userId),
                  message,
                }
              );
            }
          }

          // 更新觸發次數與時間
          const updateData: Record<string, unknown> = {
            lastTriggered: new Date(),
            triggerCount: newTriggerCount,
          };

          // 如果達到最大觸發次數，自動停用
          if (alert.maxTriggers > 0 && newTriggerCount >= alert.maxTriggers) {
            updateData.isActive = false;
          }

          await Alert.findByIdAndUpdate(alert._id, updateData);
          triggeredCount++;
          console.log(`[Alert] Triggered: ${alert.market}:${alert.stockSymbol} ${alert.type} ${alert.targetValue} (${newTriggerCount}/${alert.maxTriggers || '∞'})`);
        }
      } catch (err) {
        console.error(`Error checking alert for ${alert.stockSymbol}:`, err);
      }
    }

    return NextResponse.json({
      message: 'Alert check completed',
      triggered: triggeredCount,
      skippedMarkets,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}
