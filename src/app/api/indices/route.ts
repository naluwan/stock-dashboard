import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface IndexQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

const INDICES: { symbol: string; name: string }[] = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: '納斯達克' },
  { symbol: '^DJI', name: '道瓊' },
  { symbol: '^VIX', name: 'VIX 恐慌' },
  { symbol: 'DX-Y.NYB', name: '美元指數' },
  { symbol: '^TWII', name: '台灣加權' },
  { symbol: 'TWD=X', name: '台幣匯率' },
];

async function fetchOne(symbol: string, name: string): Promise<IndexQuote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!res.ok) return { symbol, name, price: null, change: null, changePercent: null };

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { symbol, name, price: null, change: null, changePercent: null };

    const meta = result.meta;
    const price: number = meta?.regularMarketPrice ?? meta?.previousClose ?? 0;
    const prev: number = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
    const change = prev > 0 ? price - prev : 0;
    const changePercent = prev > 0 ? (change / prev) * 100 : 0;

    return {
      symbol,
      name,
      price: Number.isFinite(price) ? price : null,
      change: Number.isFinite(change) ? change : null,
      changePercent: Number.isFinite(changePercent) ? changePercent : null,
    };
  } catch {
    return { symbol, name, price: null, change: null, changePercent: null };
  }
}

export async function GET() {
  try {
    const results = await Promise.all(
      INDICES.map(({ symbol, name }) => fetchOne(symbol, name)),
    );
    return NextResponse.json({
      indices: results,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Indices fetch error:', error);
    return NextResponse.json({ error: '指數抓取失敗' }, { status: 500 });
  }
}
