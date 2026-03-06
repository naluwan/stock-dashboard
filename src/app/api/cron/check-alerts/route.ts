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

export async function GET() {
  try {
    await connectDB();

    const activeAlerts = await Alert.find({ isActive: true }).lean() as IAlert[];

    if (activeAlerts.length === 0) {
      return NextResponse.json({ message: 'No active alerts', triggered: 0 });
    }

    const notificationConfig = await NotificationConfig.findOne({}).lean();
    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      try {
        const price = await fetchStockPrice(alert.stockSymbol, alert.market as Market);
        if (!price) continue;

        const stock = await Stock.findOne({ symbol: alert.stockSymbol, market: alert.market }).lean();
        if (!stock) continue;

        const avgPrice = calculateAveragePrice(stock.purchases);
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
          // Cooldown: don't trigger again within 1 hour
          if (alert.lastTriggered) {
            const lastTriggeredTime = new Date(alert.lastTriggered).getTime();
            if (Date.now() - lastTriggeredTime < 60 * 60 * 1000) continue;
          }

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
                  subject: `股票警報: ${alert.stockName} (${alert.stockSymbol})`,
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

          await Alert.findByIdAndUpdate(alert._id, { lastTriggered: new Date() });
          triggeredCount++;
        }
      } catch (err) {
        console.error(`Error checking alert for ${alert.stockSymbol}:`, err);
      }
    }

    return NextResponse.json({ message: 'Alert check completed', triggered: triggeredCount });
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}
