import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TradingConfig from '@/models/TradingConfig';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectDB();
    let config = await TradingConfig.findOne();
    if (!config) {
      config = await TradingConfig.create({});
    }
    return NextResponse.json(config.toObject());
  } catch (error) {
    console.error('GET /api/trading-config error:', error);
    return NextResponse.json({ error: '讀取設定失敗' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { twStockFeeRate, twStockMinFee, usStockFeeRate } = body;

    const update: Record<string, number> = {};
    if (typeof twStockFeeRate === 'number') update.twStockFeeRate = twStockFeeRate;
    if (typeof twStockMinFee === 'number') update.twStockMinFee = twStockMinFee;
    if (typeof usStockFeeRate === 'number') update.usStockFeeRate = usStockFeeRate;

    let config = await TradingConfig.findOne();
    if (!config) {
      config = await TradingConfig.create(update);
    } else {
      Object.assign(config, update);
      await config.save();
    }
    return NextResponse.json(config.toObject());
  } catch (error) {
    console.error('PUT /api/trading-config error:', error);
    return NextResponse.json({ error: '儲存設定失敗' }, { status: 500 });
  }
}
