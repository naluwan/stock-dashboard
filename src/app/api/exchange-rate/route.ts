import { NextResponse } from 'next/server';

// 快取匯率（每 30 分鐘更新一次）
let cachedRate: number | null = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000;

async function fetchUSDTWD(): Promise<number> {
  if (cachedRate && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedRate;
  }

  // 方案一：Yahoo Finance
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const json = await res.json();
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 0) {
        cachedRate = price;
        cacheTime = Date.now();
        return price;
      }
    }
  } catch (e) {
    console.error('Yahoo exchange rate failed:', e);
  }

  // 方案二：ExchangeRate API (免費)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.TWD;
      if (rate && rate > 0) {
        cachedRate = rate;
        cacheTime = Date.now();
        return rate;
      }
    }
  } catch (e) {
    console.error('ExchangeRate API failed:', e);
  }

  // 預設匯率
  return cachedRate || 32.5;
}

export async function GET() {
  try {
    const rate = await fetchUSDTWD();
    return NextResponse.json({ rate, updatedAt: new Date() });
  } catch (error) {
    console.error('Exchange rate error:', error);
    return NextResponse.json({ rate: 32.5, updatedAt: new Date() });
  }
}
