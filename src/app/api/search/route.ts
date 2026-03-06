import { NextRequest, NextResponse } from 'next/server';
import { fetchStockPrice, searchUSStocks, searchTWStocks } from '@/lib/stock-api';
import { Market } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const market = (searchParams.get('market') as Market) || 'TW';

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 如果是直接查詢股票代碼（取得即時報價）
    const action = searchParams.get('action');
    if (action === 'quote') {
      const price = await fetchStockPrice(query, market);
      if (!price) {
        return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
      }
      return NextResponse.json(price);
    }

    // 搜尋股票
    if (market === 'US') {
      const results = await searchUSStocks(query);
      return NextResponse.json(results);
    }

    // 台股：支援代碼和名稱搜尋
    const twResults = await searchTWStocks(query);
    return NextResponse.json(twResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
