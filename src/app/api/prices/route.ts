import { NextRequest, NextResponse } from 'next/server';
import { fetchStockPrice, fetchMultipleStockPrices } from '@/lib/stock-api';
import { Market } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') as Market;
    const symbols = searchParams.get('symbols'); // JSON array of {symbol, market}

    if (symbols) {
      const stockList = JSON.parse(symbols) as { symbol: string; market: Market }[];
      const prices = await fetchMultipleStockPrices(stockList);
      const priceObj: Record<string, unknown> = {};
      prices.forEach((value, key) => {
        priceObj[key] = value;
      });
      return NextResponse.json(priceObj);
    }

    if (!symbol || !market) {
      return NextResponse.json({ error: 'Symbol and market are required' }, { status: 400 });
    }

    const price = await fetchStockPrice(symbol, market);

    if (!price) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 });
    }

    return NextResponse.json(price);
  } catch (error) {
    console.error('GET /api/prices error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
