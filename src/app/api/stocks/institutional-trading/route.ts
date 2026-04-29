import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';

export const runtime = 'nodejs';

interface DailyTrading {
  date: string; // YYYY-MM-DD
  foreignNet: number; // 外資買賣超 (股)
  trustNet: number; // 投信買賣超 (股)
  dealerNet: number; // 自營商買賣超 (股)
  totalNet: number;
}

interface InstitutionalTradingResponse {
  symbol: string;
  market: Market;
  data: DailyTrading[];
  message?: string;
  fetchedAt: string;
}

const TWSE_T86 = 'https://www.twse.com.tw/rwd/zh/fund/T86';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtDate(d: Date): { compact: string; iso: string } {
  return {
    compact: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
    iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  };
}

function parseInt0(s: unknown): number {
  if (typeof s !== 'string') return 0;
  const n = parseInt(s.replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

interface TwseField {
  fields: string[];
  data: string[][];
  stat: string;
}

async function fetchOneDay(symbol: string, dateCompact: string): Promise<{
  fields: string[];
  row: string[];
} | null> {
  try {
    const url = `${TWSE_T86}?date=${dateCompact}&selectType=ALL&response=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = (await res.json()) as TwseField;
    if (data?.stat !== 'OK' || !Array.isArray(data?.data) || !Array.isArray(data?.fields)) {
      return null;
    }

    const symbolIdx = data.fields.findIndex((f) => f.includes('證券代號'));
    if (symbolIdx === -1) return null;

    const row = data.data.find((r) => (r[symbolIdx] || '').trim() === symbol);
    if (!row) return null;

    return { fields: data.fields, row };
  } catch {
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

    if (market === 'US') {
      const empty: InstitutionalTradingResponse = {
        symbol,
        market,
        data: [],
        message: '美股無三大法人買賣超此概念',
        fetchedAt: new Date().toISOString(),
      };
      return NextResponse.json(empty);
    }

    // TW: 抓最近 5 個交易日（往前找 14 個日曆日，跳週末）
    const results: DailyTrading[] = [];
    const now = new Date();

    for (let i = 0; i < 14 && results.length < 5; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const day = d.getDay();
      if (day === 0 || day === 6) continue;

      const { compact, iso } = fmtDate(d);
      const result = await fetchOneDay(symbol, compact);
      if (!result) continue;

      const { fields, row } = result;
      const findIdx = (substr: string) => fields.findIndex((f) => f.includes(substr));

      // 「外陸資買賣超股數(不含外資自營商)」
      const foreignIdx = findIdx('外陸資買賣超股數(不含外資自營商)');
      // 「投信買賣超股數」
      const trustIdx = findIdx('投信買賣超股數');
      // 「自營商買賣超股數」（自行買賣 + 避險合計，欄位「自營商買賣超股數」總計）
      const dealerIdx = findIdx('自營商買賣超股數');
      // 「三大法人買賣超股數」
      const totalIdx = findIdx('三大法人買賣超股數');

      const foreignNet = foreignIdx >= 0 ? parseInt0(row[foreignIdx]) : 0;
      const trustNet = trustIdx >= 0 ? parseInt0(row[trustIdx]) : 0;
      const dealerNet = dealerIdx >= 0 ? parseInt0(row[dealerIdx]) : 0;
      const totalNet = totalIdx >= 0 ? parseInt0(row[totalIdx]) : foreignNet + trustNet + dealerNet;

      results.push({
        date: iso,
        foreignNet,
        trustNet,
        dealerNet,
        totalNet,
      });
    }

    const response: InstitutionalTradingResponse = {
      symbol,
      market,
      data: results.reverse(), // 由舊到新
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Institutional trading fetch error:', error);
    return NextResponse.json({ error: '三大法人資料抓取失敗' }, { status: 500 });
  }
}
