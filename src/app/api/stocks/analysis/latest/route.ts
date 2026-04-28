import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockAnalysisRecord from '@/models/StockAnalysisRecord';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market');

    if (!symbol || !market) {
      return NextResponse.json({ error: '缺少 symbol / market' }, { status: 400 });
    }

    const doc = await StockAnalysisRecord.findOne({
      symbol: symbol.toUpperCase(),
      market,
    })
      .sort({ createdAt: -1 })
      .lean<{
        _id: unknown;
        symbol: string;
        market: string;
        name: string;
        analysis: string;
        snapshot?: Record<string, number | undefined>;
        createdAt: Date;
      } | null>();

    if (!doc) return NextResponse.json(null);

    return NextResponse.json({
      _id: String(doc._id),
      symbol: doc.symbol,
      market: doc.market,
      name: doc.name,
      analysis: doc.analysis,
      snapshot: doc.snapshot,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error('Get latest stock analysis error:', error);
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}
