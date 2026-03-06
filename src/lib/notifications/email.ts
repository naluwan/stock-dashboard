import nodemailer from 'nodemailer';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail(config: EmailConfig, message: EmailMessage): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    await transporter.sendMail({
      from: config.smtpUser,
      to: message.to.join(', '),
      subject: message.subject,
      html: message.html,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export function buildAlertEmailHTML(
  stockName: string,
  stockSymbol: string,
  currentPrice: number,
  alertType: string,
  targetValue: number,
  market: string
): string {
  const currency = market === 'TW' ? 'TWD' : 'USD';
  const typeLabels: Record<string, string> = {
    above_price: `價格高於 ${targetValue} ${currency}`,
    below_price: `價格低於 ${targetValue} ${currency}`,
    above_avg_percent: `高於均價 ${targetValue}%`,
    below_avg_percent: `低於均價 ${targetValue}%`,
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📊 股票價格警報</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333;">${stockName} (${stockSymbol})</h2>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 5px 0;"><strong>目前價格:</strong> ${currentPrice} ${currency}</p>
          <p style="margin: 5px 0;"><strong>觸發條件:</strong> ${typeLabels[alertType] || alertType}</p>
          <p style="margin: 5px 0;"><strong>市場:</strong> ${market === 'TW' ? '台股' : '美股'}</p>
          <p style="margin: 5px 0;"><strong>時間:</strong> ${new Date().toLocaleString('zh-TW')}</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 15px;">
          此通知由 Stock Dashboard 自動發送
        </p>
      </div>
    </div>
  `;
}
