import cron from 'node-cron';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * 判斷目前是否在交易時段
 * 台股: 09:00 ~ 13:30 (UTC+8)
 * 美股: 21:30 ~ 04:00 (UTC+8, 即 EST 09:30 ~ 16:00)
 */
function isMarketOpen(): { tw: boolean; us: boolean } {
  const now = new Date();
  // 轉換為台灣時間
  const twTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const hours = twTime.getHours();
  const minutes = twTime.getMinutes();
  const timeValue = hours * 60 + minutes;
  const day = twTime.getDay(); // 0=Sunday, 6=Saturday

  const isWeekday = day >= 1 && day <= 5;

  // 台股: 週一到週五 09:00 ~ 13:30
  const twOpen = isWeekday && timeValue >= 540 && timeValue <= 810; // 9*60=540, 13*60+30=810

  // 美股: 週一到週五 21:30 ~ 隔日 04:00 (台灣時間)
  // 注意：跨日判斷，21:30~23:59 或 00:00~04:00
  const usOpen =
    (isWeekday && timeValue >= 1290) || // 21*60+30=1290 到午夜
    (day >= 2 && day <= 6 && timeValue <= 240); // 隔日 00:00 ~ 04:00 (週二到週六的凌晨)

  return { tw: twOpen, us: usOpen };
}

async function checkAlerts() {
  const markets = isMarketOpen();

  if (!markets.tw && !markets.us) {
    console.log(`[Cron] ${new Date().toISOString()} - 非交易時段，跳過檢查`);
    return;
  }

  console.log(
    `[Cron] ${new Date().toISOString()} - 開始檢查警報 (台股: ${markets.tw ? '開盤' : '收盤'}, 美股: ${markets.us ? '開盤' : '收盤'})`
  );

  try {
    const res = await fetch(`${APP_URL}/api/cron/check-alerts`, {
      method: 'GET',
      headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
    });
    const data = await res.json();
    console.log(`[Cron] 檢查完成 - 觸發 ${data.triggered || 0} 個警報`);
  } catch (error) {
    console.error('[Cron] 檢查警報失敗:', error);
  }
}

let isSchedulerRunning = false;

export function startCronScheduler() {
  if (isSchedulerRunning) {
    console.log('[Cron] 排程已在運行中');
    return;
  }

  // 每 5 分鐘檢查一次
  cron.schedule('*/5 * * * *', () => {
    checkAlerts();
  });

  isSchedulerRunning = true;
  console.log('[Cron] 股價警報排程已啟動 - 每 5 分鐘檢查一次（僅在交易時段）');
}
