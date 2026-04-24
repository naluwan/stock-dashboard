import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PortfolioAnalysis from '@/models/PortfolioAnalysis';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectDB();
    const list = await PortfolioAnalysis.find({})
      .select('title createdAt snapshot usdRate')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      list.map((a) => ({
        _id: String(a._id),
        title: a.title,
        createdAt: a.createdAt,
        holdingsCount: a.snapshot?.length || 0,
        usdRate: a.usdRate,
      })),
    );
  } catch (error) {
    console.error('List analyses error:', error);
    return NextResponse.json({ error: '讀取歷史分析失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    await PortfolioAnalysis.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete analysis error:', error);
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
