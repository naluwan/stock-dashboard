'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL = 5 * 60 * 1000; // 每 5 分鐘檢查一次

export function useAlertPoller() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const res = await fetch('/api/cron/check-alerts');
        if (res.ok) {
          const data = await res.json();
          if (data.triggered > 0) {
            console.log(`[AlertPoller] ${data.triggered} alerts triggered`);
          }
        }
      } catch (error) {
        console.error('[AlertPoller] Failed to check alerts:', error);
      }
    };

    // 啟動後先等 10 秒再第一次檢查（避免頁面載入時卡頓）
    const initialTimer = setTimeout(() => {
      checkAlerts();
      timerRef.current = setInterval(checkAlerts, POLL_INTERVAL);
    }, 10 * 1000);

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
}
