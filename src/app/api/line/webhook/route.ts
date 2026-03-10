import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import NotificationConfig from '@/models/NotificationConfig';

// LINE Webhook 驗證簽名
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// POST: 接收 LINE Webhook 事件
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // 從資料庫讀取 Channel Secret 進行驗證
    await connectDB();
    const config = await NotificationConfig.findOne({});

    console.log('[LINE Webhook] Config found:', !!config);
    console.log('[LINE Webhook] Has channelSecret:', !!config?.line?.channelSecret);
    console.log('[LINE Webhook] Has signature:', !!signature);

    if (config?.line?.channelSecret) {
      const secret = config.line.channelSecret.trim();
      const isValid = verifySignature(body, signature, secret);
      console.log('[LINE Webhook] Signature valid:', isValid);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      console.log('[LINE Webhook] No channelSecret in DB, skipping signature verification');
    }

    const data = JSON.parse(body);
    const events = data.events || [];
    console.log('[LINE Webhook] Events count:', events.length);

    for (const event of events) {
      console.log('[LINE Webhook] Event type:', event.type, event.message?.type || '');

      // 當有人加 Bot 為好友時，自動記錄 User ID
      if (event.type === 'follow') {
        const userId = event.source?.userId;
        if (userId && config) {
          const exists = config.line.recipients.some(
            (r: { userId: string }) => r.userId === userId
          );

          if (!exists) {
            let displayName = `User ${userId.substring(0, 8)}`;
            try {
              const profileRes = await fetch(
                `https://api.line.me/v2/bot/profile/${userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${config.line.channelAccessToken}`,
                  },
                }
              );
              if (profileRes.ok) {
                const profile = await profileRes.json();
                displayName = profile.displayName || displayName;
              }
            } catch (e) {
              console.error('[LINE Webhook] Failed to get profile:', e);
            }

            config.line.recipients.push({ userId, displayName });
            await config.save();
            console.log(`[LINE Webhook] 新增接收者: ${displayName} (${userId})`);
          }
        }
      }

      // 當有人傳任何訊息給 Bot 時，回覆他的 User ID
      if (event.type === 'message') {
        const userId = event.source?.userId;
        const replyToken = event.replyToken;

        if (userId && replyToken && config?.line?.channelAccessToken) {
          // 同時自動加入接收者（如果還沒加過）
          const exists = config.line.recipients.some(
            (r: { userId: string }) => r.userId === userId
          );
          if (!exists) {
            let displayName = `User ${userId.substring(0, 8)}`;
            try {
              const profileRes = await fetch(
                `https://api.line.me/v2/bot/profile/${userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${config.line.channelAccessToken}`,
                  },
                }
              );
              if (profileRes.ok) {
                const profile = await profileRes.json();
                displayName = profile.displayName || displayName;
              }
            } catch (e) { /* ignore */ }
            config.line.recipients.push({ userId, displayName });
            await config.save();
            console.log(`[LINE Webhook] 自動新增接收者: ${displayName} (${userId})`);
          }

          try {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.line.channelAccessToken}`,
              },
              body: JSON.stringify({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: `✅ 你已成功連結 Stock Dashboard！\n\n你的 User ID:\n${userId}\n\n你將會收到股票價格警報通知。`,
                  },
                ],
              }),
            });
            console.log(`[LINE Webhook] 已回覆 User ID 給 ${userId}`);
          } catch (e) {
            console.error('[LINE Webhook] Reply error:', e);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LINE Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

// GET: LINE Webhook 驗證端點
export async function GET() {
  return NextResponse.json({ status: 'LINE Webhook is active' });
}
