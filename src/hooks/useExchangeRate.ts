'use client';

import { useState, useEffect } from 'react';

interface ExchangeRateData {
  rate: number;
  isLoading: boolean;
  updatedAt: Date | null;
}

export function useExchangeRate(): ExchangeRateData {
  const [rate, setRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('/api/exchange-rate');
        if (res.ok) {
          const data = await res.json();
          setRate(data.rate);
          setUpdatedAt(new Date(data.updatedAt));
        }
      } catch {
        // 使用預設值
        setRate(32.5);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { rate, isLoading, updatedAt };
}
