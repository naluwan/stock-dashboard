import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';
import { calculateAveragePrice } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { stockId, shares, price, date, note, exchangeRate } = body;

    if (!stockId || !shares || !price) {
      return NextResponse.json(
        { error: '缺少必要欄位: stockId, shares, price' },
        { status: 400 }
      );
    }

    const stock = await Stock.findById(stockId);
    if (!stock) {
      return NextResponse.json({ error: '找不到該股票' }, { status: 404 });
    }

    // 計算目前持有股數
    const boughtShares = stock.purchases.reduce(
      (sum: number, p: { shares: number }) => sum + p.shares,
      0
    );
    const soldShares = (stock.sales || []).reduce(
      (sum: number, s: { shares: number }) => sum + s.shares,
      0
    );
    const holdingShares = boughtShares - soldShares;

    if (shares > holdingShares) {
      return NextResponse.json(
        { error: `賣出股數 (${shares}) 超過持有股數 (${holdingShares})` },
        { status: 400 }
      );
    }

    // 計算賣出當下的加權平均成本並鎖定
    const avgCostAtSale = calculateAveragePrice(stock.purchases);

    stock.sales.push({
      shares,
      price,
      date: date ? new Date(date) : new Date(),
      note: note || '',
      exchangeRate: exchangeRate || undefined,
      avgCostAtSale,
    });

    await stock.save();

    return NextResponse.json(stock.toObject());
  } catch (error) {
    console.error('POST /api/stocks/sell error:', error);
    return NextResponse.json({ error: '賣出失敗' }, { status: 500 });
  }
}
