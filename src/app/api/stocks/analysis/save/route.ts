import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockAnalysisRecord from '@/models/StockAnalysisRecord';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { symbol, market, name, analysis, snapshot } = body;

    if (!symbol || !market || !name) {
      return NextResponse.json({ error: '缺少 symbol / market / name' }, { status: 400 });
    }
    if (!analysis || typeof analysis !== 'string') {
      return NextResponse.json({ error: '缺少 analysis 內容' }, { status: 400 });
    }

    const saved = await StockAnalysisRecord.create({
      symbol: String(symbol).toUpperCase(),
      market,
      name,
      analysis,
      snapshot,
    });

    return NextResponse.json({
      _id: saved._id,
      symbol: saved.symbol,
      market: saved.market,
      name: saved.name,
      analysis: saved.analysis,
      snapshot: saved.snapshot,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    console.error('Save stock analysis error:', error);
    const message = error instanceof Error ? error.message : '儲存失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
