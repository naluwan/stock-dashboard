import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PortfolioAnalysis from '@/models/PortfolioAnalysis';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const doc = await PortfolioAnalysis.findById(id).lean();
    if (!doc) return NextResponse.json({ error: '找不到' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 });
  }
}
