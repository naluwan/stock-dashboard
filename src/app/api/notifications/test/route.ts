import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NotificationConfig from '@/models/NotificationConfig';
import { sendEmail } from '@/lib/notifications/email';
import { sendLineMessage } from '@/lib/notifications/line';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { channel } = body; // 'email' | 'line' | 'all'

    const config = await NotificationConfig.findOne({});
    if (!config) {
      return NextResponse.json({ error: '尚未設定通知，請先到通知設定頁面完成設定' }, { status: 400 });
    }

    const results: { channel: string; success: boolean; error?: string }[] = [];

    // 測試 LINE
    if (channel === 'line' || channel === 'all') {
      if (!config.line?.enabled) {
        results.push({ channel: 'line', success: false, error: 'LINE 通知未啟用' });
      } else if (!config.line?.channelAccessToken) {
        results.push({ channel: 'line', success: false, error: '未設定 Channel Access Token' });
      } else if (config.line.recipients.length === 0) {
        results.push({ channel: 'line', success: false, error: '沒有 LINE 接收者，請先加 Bot 好友或手動新增' });
      } else {
        try {
          const success = await sendLineMessage(
            { channelAccessToken: config.line.channelAccessToken },
            {
              userIds: config.line.recipients.map((r: { userId: string }) => r.userId),
              message: `🧪 測試通知\n\nStock Dashboard 通知功能正常運作！\n\n時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`,
            }
          );
          results.push({
            channel: 'line',
            success,
            error: success ? undefined : '發送失敗，請確認 Token 和 User ID 是否正確',
          });
        } catch (e) {
          results.push({ channel: 'line', success: false, error: String(e) });
        }
      }
    }

    // 測試 Email
    if (channel === 'email' || channel === 'all') {
      if (!config.email?.enabled) {
        results.push({ channel: 'email', success: false, error: 'Email 通知未啟用' });
      } else if (config.email.recipients.length === 0) {
        results.push({ channel: 'email', success: false, error: '沒有設定收件人' });
      } else {
        try {
          const success = await sendEmail(
            {
              smtpHost: config.email.smtpHost,
              smtpPort: config.email.smtpPort,
              smtpUser: config.email.smtpUser,
              smtpPass: config.email.smtpPass,
            },
            {
              to: config.email.recipients,
              subject: '🧪 Stock Dashboard 測試通知',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🧪 測試通知</h1>
                  </div>
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
                    <p>Stock Dashboard 的 Email 通知功能正常運作！</p>
                    <p style="color: #666;">時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                  </div>
                </div>
              `,
            }
          );
          results.push({
            channel: 'email',
            success,
            error: success ? undefined : '發送失敗，請確認 SMTP 設定是否正確',
          });
        } catch (e) {
          results.push({ channel: 'email', success: false, error: String(e) });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: '測試發送失敗' }, { status: 500 });
  }
}
