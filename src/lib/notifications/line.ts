import { messagingApi } from '@line/bot-sdk';

interface LineConfig {
  channelAccessToken: string;
}

interface LineMessage {
  userIds: string[];
  message: string;
}

export async function sendLineMessage(config: LineConfig, msg: LineMessage): Promise<boolean> {
  try {
    const client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });

    const promises = msg.userIds.map((userId) =>
      client.pushMessage({
        to: userId,
        messages: [
          {
            type: 'flex',
            altText: '股票價格警報',
            contents: buildAlertFlexMessage(msg.message),
          },
        ],
      })
    );

    await Promise.allSettled(promises);
    return true;
  } catch (error) {
    console.error('LINE send error:', error);
    return false;
  }
}

function buildAlertFlexMessage(text: string): messagingApi.FlexBubble {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '📊 股票價格警報',
          weight: 'bold',
          size: 'lg',
          color: '#ffffff',
        },
      ],
      backgroundColor: '#667eea',
      paddingAll: '15px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: text,
          wrap: true,
          size: 'md',
          color: '#333333',
        },
      ],
      paddingAll: '15px',
    },
  };
}

export function buildAlertLineMessage(
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

  return `${stockName} (${stockSymbol})\n目前價格: ${currentPrice} ${currency}\n觸發條件: ${typeLabels[alertType] || alertType}\n市場: ${market === 'TW' ? '台股' : '美股'}\n時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;
}
