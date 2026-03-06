import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';

interface HistoryDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 取得 Yahoo Finance 用的台股代碼（上市 .TW，上櫃 .TWO）
async function getYahooTWSymbol(symbol: string): Promise<string> {
  // 先嘗試 .TW（上市），如果失敗再試 .TWO（上櫃）
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const twSymbol = `${symbol}.TW`;
    const quote: any = await yahooFinance.quote(twSymbol);
    if (quote && quote.regularMarketPrice) return twSymbol;
  } catch {
    // ignore
  }
  return `${symbol}.TWO`;
}

// 當日分時資料 — 直接呼叫 Yahoo Finance REST API（比 npm 套件穩定）
async function fetchIntraday(symbol: string, market: Market): Promise<HistoryDataPoint[]> {
  // 依序嘗試多個 Yahoo 代碼（台股 .TW / .TWO，美股直接用）
  const candidates = market === 'TW'
    ? [`${symbol}.TW`, `${symbol}.TWO`]
    : [symbol];

  for (const yahooSymbol of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=1d&includePrePost=false`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!res.ok) continue;

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const timestamps: number[] = result.timestamp || [];
      const ohlcv = result.indicators?.quote?.[0];
      if (!ohlcv || timestamps.length === 0) continue;

      const points: HistoryDataPoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const close = ohlcv.close?.[i];
        if (close == null) continue;

        points.push({
          date: new Date(timestamps[i] * 1000).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: market === 'TW' ? 'Asia/Taipei' : 'America/New_York',
          }),
          open: ohlcv.open?.[i] || 0,
          high: ohlcv.high?.[i] || 0,
          low: ohlcv.low?.[i] || 0,
          close,
          volume: ohlcv.volume?.[i] || 0,
        });
      }

      if (points.length > 0) return points;
    } catch (error) {
      console.error(`Error fetching intraday for ${yahooSymbol}:`, error);
    }
  }

  return [];
}

// 美股備案：直接呼叫 Yahoo Finance REST API 取日K
async function fetchUSHistoryFallback(symbol: string, days: number): Promise<HistoryDataPoint[]> {
  try {
    // 將天數對應到 Yahoo Finance range 參數
    let range = '1mo';
    if (days <= 5) range = '5d';
    else if (days <= 15) range = '1mo';
    else if (days <= 30) range = '3mo';
    else if (days <= 180) range = '6mo';
    else range = '1y';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const ohlcv = result.indicators?.quote?.[0];
    if (!ohlcv || timestamps.length === 0) return [];

    const points: HistoryDataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = ohlcv.close?.[i];
      if (close == null) continue;

      const dateOpts: Intl.DateTimeFormatOptions = days > 60
        ? { year: '2-digit', month: '2-digit', day: '2-digit' }
        : { month: '2-digit', day: '2-digit' };
      points.push({
        date: new Date(timestamps[i] * 1000).toLocaleDateString('zh-TW', dateOpts),
        open: ohlcv.open?.[i] || 0,
        high: ohlcv.high?.[i] || 0,
        low: ohlcv.low?.[i] || 0,
        close,
        volume: ohlcv.volume?.[i] || 0,
      });
    }

    return points.slice(-days);
  } catch (error) {
    console.error(`Error fetching US history fallback for ${symbol}:`, error);
    return [];
  }
}

// 日K歷史資料（統一用 yahoo-finance2，備援用 REST API）
async function fetchDailyHistory(symbol: string, market: Market, days: number): Promise<HistoryDataPoint[]> {
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const yahooSymbol = market === 'TW' ? await getYahooTWSymbol(symbol) : symbol;

    const endDate = new Date();
    const startDate = new Date();
    // 多抓一些天數以排除假日和週末
    startDate.setDate(startDate.getDate() - Math.ceil(days * 1.6) - 5);

    const result: any = await yahooFinance.historical(yahooSymbol, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      interval: '1d',
    });

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('No data from yahoo-finance2');
    }

    // 只取最近 N 個交易日
    const dateOpts: Intl.DateTimeFormatOptions = days > 60
      ? { year: '2-digit', month: '2-digit', day: '2-digit' }
      : { month: '2-digit', day: '2-digit' };
    return result.slice(-days).map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('zh-TW', dateOpts),
      open: item.open || 0,
      high: item.high || 0,
      low: item.low || 0,
      close: item.close || 0,
      volume: item.volume || 0,
    }));
  } catch (error) {
    console.error(`Error fetching daily history for ${symbol}:`, error);

    // 備援：台股用 TWSE/TPEX API，美股用 Yahoo REST API
    if (market === 'TW') {
      return fetchTWHistoryFallback(symbol, days);
    }
    return fetchUSHistoryFallback(symbol, days);
  }
}

// 台股備案：用 TWSE/TPEX API（跨月抓取）
async function fetchTWHistoryFallback(symbol: string, days: number): Promise<HistoryDataPoint[]> {
  try {
    const allData: HistoryDataPoint[] = [];
    const now = new Date();

    // 往回抓足夠的月份（每月約 22 個交易日）
    const monthsNeeded = Math.ceil(days / 20) + 1;

    for (let i = 0; i < monthsNeeded; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${year}${month}01`;

      // 先嘗試上市（TWSE）
      const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${symbol}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const data = await res.json();

      if (data.stat === 'OK' && data.data) {
        const monthData = data.data.map((row: string[]) => ({
          date: row[0].replace(/\//g, '/'),
          open: parseFloat(row[3]?.replace(/,/g, '')) || 0,
          high: parseFloat(row[4]?.replace(/,/g, '')) || 0,
          low: parseFloat(row[5]?.replace(/,/g, '')) || 0,
          close: parseFloat(row[6]?.replace(/,/g, '')) || 0,
          volume: parseInt(row[1]?.replace(/,/g, '')) || 0,
        }));
        allData.unshift(...monthData);
        continue;
      }

      // 嘗試上櫃（TPEX）
      const otcUrl = `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=${year - 1911}/${month}/01&stkno=${symbol}&_=${Date.now()}`;
      const otcRes = await fetch(otcUrl, { next: { revalidate: 300 } });
      const otcData = await otcRes.json();

      if (otcData.aaData && Array.isArray(otcData.aaData)) {
        const monthData = otcData.aaData.map((row: string[]) => ({
          date: row[0],
          open: parseFloat(row[3]?.replace(/,/g, '')) || 0,
          high: parseFloat(row[4]?.replace(/,/g, '')) || 0,
          low: parseFloat(row[5]?.replace(/,/g, '')) || 0,
          close: parseFloat(row[6]?.replace(/,/g, '')) || 0,
          volume: parseInt(row[1]?.replace(/,/g, '')) || 0,
        }));
        allData.unshift(...monthData);
      }
    }

    return allData.slice(-days);
  } catch (error) {
    console.error(`Error fetching TW history fallback for ${symbol}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') as Market;
    const days = parseInt(searchParams.get('days') || '30');

    if (!symbol || !market) {
      return NextResponse.json({ error: 'Symbol and market are required' }, { status: 400 });
    }

    const intraday = searchParams.get('intraday') === 'true';

    let history: HistoryDataPoint[];
    let fallback = false;

    if (intraday) {
      history = await fetchIntraday(symbol, market);
      // 拿不到分時資料時，自動退回最近 1 個交易日的日K
      if (history.length === 0) {
        history = await fetchDailyHistory(symbol, market, 1);
        fallback = true;
      }
    } else {
      history = await fetchDailyHistory(symbol, market, days);
    }

    return NextResponse.json({ data: history, fallback });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
