import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';
import { calculateAveragePrice } from '@/lib/utils';

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');
    const saleId = searchParams.get('saleId');

    if (!stockId || !saleId) {
      return NextResponse.json(
        { error: '缺少 stockId 或 saleId' },
        { status: 400 }
      );
    }

    const stock = await Stock.findById(stockId);
    if (!stock) {
      return NextResponse.json({ error: '找不到該股票' }, { status: 404 });
    }

    const before = stock.sales.length;
    stock.sales = stock.sales.filter(
      (s: { _id: { toString: () => string } }) => s._id.toString() !== saleId
    );

    if (stock.sales.length === before) {
      return NextResponse.json({ error: '找不到該賣出紀錄' }, { status: 404 });
    }

    await stock.save();
    return NextResponse.json(stock.toObject());
  } catch (error) {
    console.error('DELETE /api/stocks/sell error:', error);
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { stockId, shares, price, date, note, exchangeRate, commission, tax } = body;

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
      commission: commission || 0,
      tax: tax || 0,
    });

    await stock.save();

    return NextResponse.json(stock.toObject());
  } catch (error) {
    console.error('POST /api/stocks/sell error:', error);
    return NextResponse.json({ error: '賣出失敗' }, { status: 500 });
  }
}
