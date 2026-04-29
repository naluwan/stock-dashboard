import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';

export const runtime = 'nodejs';

interface QuarterlyData {
  date: string;
  value: number | null;
}

interface DividendItem {
  year: number;
  amount: number;
}

interface FundamentalsResponse {
  symbol: string;
  market: Market;
  marketCap: number | null;
  peTrailing: number | null;
  peForward: number | null;
  eps: number | null;
  dividendYield: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  priceOpen: number | null;
  priceHigh: number | null;
  priceLow: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  roe: number | null;
  roa: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  quarterlyRevenue: QuarterlyData[];
  quarterlyEarnings: QuarterlyData[];
  dividends: DividendItem[];
  fetchedAt: string;
}

function emptyResponse(symbol: string, market: Market): FundamentalsResponse {
  return {
    symbol,
    market,
    marketCap: null,
    peTrailing: null,
    peForward: null,
    eps: null,
    dividendYield: null,
    weekHigh52: null,
    weekLow52: null,
    priceOpen: null,
    priceHigh: null,
    priceLow: null,
    profitMargin: null,
    operatingMargin: null,
    grossMargin: null,
    roe: null,
    roa: null,
    revenueGrowth: null,
    earningsGrowth: null,
    quarterlyRevenue: [],
    quarterlyEarnings: [],
    dividends: [],
    fetchedAt: new Date().toISOString(),
  };
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && 'raw' in (v as Record<string, unknown>)) {
    const raw = (v as { raw?: unknown }).raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  }
  return null;
}

interface DividendEvent {
  amount: number;
  date: number;
}

async function fetchDividends(symbol: string): Promise<DividendItem[]> {
  // /v8/finance/chart 不需要 crumb
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1mo&range=5y&events=div`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!res.ok) return [];

    const data = await res.json();
    const events = data?.chart?.result?.[0]?.events?.dividends as
      | Record<string, DividendEvent>
      | undefined;
    if (!events) return [];

    const yearMap = new Map<number, number>();
    for (const key of Object.keys(events)) {
      const ev = events[key];
      if (!ev || typeof ev.amount !== 'number' || typeof ev.date !== 'number') continue;
      const year = new Date(ev.date * 1000).getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + ev.amount);
    }

    return Array.from(yearMap.entries())
      .map(([year, amount]) => ({ year, amount: Math.round(amount * 1000) / 1000 }))
      .sort((a, b) => b.year - a.year)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSummary(symbol: string): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const YahooFinance = (await import('yahoo-finance2')).default as any;
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'summaryDetail',
        'price',
        'defaultKeyStatistics',
        'financialData',
        'earnings',
        'incomeStatementHistoryQuarterly',
      ],
    });
    return result;
  } catch (error) {
    console.error(`fetchSummary failed for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') as Market | null;

    if (!symbol || !market) {
      return NextResponse.json({ error: '缺少 symbol / market' }, { status: 400 });
    }

    const yahooSymbol = market === 'TW' ? `${symbol}.TW` : symbol;

    let summary = await fetchSummary(yahooSymbol);
    // 台股可能是上櫃 (.TWO)
    if (!summary && market === 'TW') {
      summary = await fetchSummary(`${symbol}.TWO`);
    }

    const dividends = await fetchDividends(
      market === 'TW' ? `${symbol}.TW` : symbol,
    );

    const response = emptyResponse(symbol, market);

    if (summary) {
      const sd = summary.summaryDetail || {};
      const price = summary.price || {};
      const ks = summary.defaultKeyStatistics || {};
      const fd = summary.financialData || {};
      const earnings = summary.earnings || {};

      response.marketCap = num(price.marketCap) ?? num(sd.marketCap);
      response.peTrailing = num(sd.trailingPE) ?? num(ks.trailingPE);
      response.peForward = num(sd.forwardPE) ?? num(ks.forwardPE);
      response.eps = num(ks.trailingEps);
      response.dividendYield = num(sd.dividendYield) ?? num(sd.trailingAnnualDividendYield);
      response.weekHigh52 = num(sd.fiftyTwoWeekHigh);
      response.weekLow52 = num(sd.fiftyTwoWeekLow);
      response.priceOpen = num(sd.open) ?? num(price.regularMarketOpen);
      response.priceHigh = num(sd.dayHigh) ?? num(price.regularMarketDayHigh);
      response.priceLow = num(sd.dayLow) ?? num(price.regularMarketDayLow);

      response.profitMargin = num(fd.profitMargins);
      response.operatingMargin = num(fd.operatingMargins);
      response.grossMargin = num(fd.grossMargins);
      response.roe = num(fd.returnOnEquity);
      response.roa = num(fd.returnOnAssets);
      response.revenueGrowth = num(fd.revenueGrowth);
      response.earningsGrowth = num(fd.earningsGrowth);

      // 季財報
      const quarterlyChart = earnings?.financialsChart?.quarterly;
      if (Array.isArray(quarterlyChart)) {
        response.quarterlyRevenue = quarterlyChart
          .map((q: { date?: string; revenue?: unknown }) => ({
            date: typeof q.date === 'string' ? q.date : '',
            value: num(q.revenue),
          }))
          .filter((q: QuarterlyData) => q.date)
          .slice(-4);
        response.quarterlyEarnings = quarterlyChart
          .map((q: { date?: string; earnings?: unknown }) => ({
            date: typeof q.date === 'string' ? q.date : '',
            value: num(q.earnings),
          }))
          .filter((q: QuarterlyData) => q.date)
          .slice(-4);
      }
    }

    response.dividends = dividends;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fundamentals fetch error:', error);
    return NextResponse.json({ error: '基本面抓取失敗' }, { status: 500 });
  }
}
