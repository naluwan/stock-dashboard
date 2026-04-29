import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';

export const runtime = 'nodejs';

interface QuarterlyData {
  date: string; // 'YYYY-Qx'
  value: number | null;
}

interface DividendItem {
  year: number;
  amount: number;
}

interface FundamentalsResponse {
  symbol: string;
  market: Market;
  // 估值
  marketCap: number | null;
  peTrailing: number | null;
  peForward: number | null;
  eps: number | null;
  dividendYield: number | null; // 殖利率 (decimal, e.g. 0.025 = 2.5%)
  // 52W
  weekHigh52: number | null;
  weekLow52: number | null;
  // 開高低收
  priceOpen: number | null;
  priceHigh: number | null;
  priceLow: number | null;
  // 獲利率
  profitMargin: number | null; // 淨利率
  operatingMargin: number | null; // 營益率
  grossMargin: number | null; // 毛利率
  roe: number | null;
  roa: number | null;
  // 成長
  revenueGrowth: number | null; // YoY
  earningsGrowth: number | null; // YoY
  // 季營收 / EPS
  quarterlyRevenue: QuarterlyData[];
  quarterlyEarnings: QuarterlyData[];
  // 股利
  dividends: DividendItem[];
  // 來源
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

interface QuoteSummaryResult {
  result?: Array<Record<string, unknown>>;
}

function pickNumber(obj: unknown, ...path: string[]): number | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (typeof cur === 'number' && Number.isFinite(cur)) return cur;
  if (cur && typeof cur === 'object' && 'raw' in cur) {
    const raw = (cur as { raw?: unknown }).raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  }
  return null;
}

async function fetchQuoteSummary(symbol: string): Promise<Record<string, unknown>> {
  const modules = [
    'summaryDetail',
    'price',
    'defaultKeyStatistics',
    'financialData',
    'earnings',
    'incomeStatementHistoryQuarterly',
  ].join(',');

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });
  if (!res.ok) return {};

  const data = (await res.json()) as { quoteSummary?: QuoteSummaryResult };
  const result = data?.quoteSummary?.result?.[0];
  return (result as Record<string, unknown>) || {};
}

interface DividendEvent {
  amount: number;
  date: number; // unix timestamp
}

async function fetchDividends(symbol: string): Promise<DividendItem[]> {
  // 抓 5 年股利（用 chart endpoint 加 events=div）
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1mo&range=5y&events=div`;
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

    let summary = await fetchQuoteSummary(yahooSymbol);
    // 台股可能是上櫃 (.TWO)
    if ((!summary || Object.keys(summary).length === 0) && market === 'TW') {
      summary = await fetchQuoteSummary(`${symbol}.TWO`);
    }

    const dividends = await fetchDividends(
      market === 'TW' ? `${symbol}.TW` : symbol,
    ).catch(() => []);

    const response = emptyResponse(symbol, market);

    if (summary && Object.keys(summary).length > 0) {
      response.marketCap = pickNumber(summary, 'price', 'marketCap');
      response.peTrailing = pickNumber(summary, 'summaryDetail', 'trailingPE');
      response.peForward = pickNumber(summary, 'summaryDetail', 'forwardPE');
      response.eps = pickNumber(summary, 'defaultKeyStatistics', 'trailingEps');
      response.dividendYield =
        pickNumber(summary, 'summaryDetail', 'dividendYield') ??
        pickNumber(summary, 'summaryDetail', 'trailingAnnualDividendYield');
      response.weekHigh52 = pickNumber(summary, 'summaryDetail', 'fiftyTwoWeekHigh');
      response.weekLow52 = pickNumber(summary, 'summaryDetail', 'fiftyTwoWeekLow');
      response.priceOpen = pickNumber(summary, 'summaryDetail', 'open');
      response.priceHigh = pickNumber(summary, 'summaryDetail', 'dayHigh');
      response.priceLow = pickNumber(summary, 'summaryDetail', 'dayLow');

      // financialData
      response.profitMargin = pickNumber(summary, 'financialData', 'profitMargins');
      response.operatingMargin = pickNumber(summary, 'financialData', 'operatingMargins');
      response.grossMargin = pickNumber(summary, 'financialData', 'grossMargins');
      response.roe = pickNumber(summary, 'financialData', 'returnOnEquity');
      response.roa = pickNumber(summary, 'financialData', 'returnOnAssets');
      response.revenueGrowth = pickNumber(summary, 'financialData', 'revenueGrowth');
      response.earningsGrowth = pickNumber(summary, 'financialData', 'earningsGrowth');

      // 季財報
      const earnings = summary.earnings as Record<string, unknown> | undefined;
      if (earnings) {
        const quarterly = (earnings.financialsChart as Record<string, unknown> | undefined)
          ?.quarterly as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(quarterly)) {
          response.quarterlyRevenue = quarterly
            .map((q) => ({
              date: typeof q.date === 'string' ? q.date : '',
              value: pickNumber(q, 'revenue'),
            }))
            .filter((q) => q.date)
            .slice(-4);
          response.quarterlyEarnings = quarterly
            .map((q) => ({
              date: typeof q.date === 'string' ? q.date : '',
              value: pickNumber(q, 'earnings'),
            }))
            .filter((q) => q.date)
            .slice(-4);
        }
      }
    }

    response.dividends = dividends;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fundamentals fetch error:', error);
    return NextResponse.json({ error: '基本面抓取失敗' }, { status: 500 });
  }
}
