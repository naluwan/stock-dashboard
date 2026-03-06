import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SearchHistory from '@/models/SearchHistory';

// 取得搜尋紀錄（最近 10 筆）
export async function GET() {
  try {
    await connectDB();
    const history = await SearchHistory.find()
      .sort({ searchedAt: -1 })
      .limit(10)
      .lean();
    return NextResponse.json(history);
  } catch (error) {
    console.error('Search history GET error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// 新增/更新搜尋紀錄
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { symbol, name, market } = await request.json();

    if (!symbol || !name || !market) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await SearchHistory.findOneAndUpdate(
      { symbol, market },
      { symbol, name, market, searchedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search history POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// 清除全部搜尋紀錄
export async function DELETE() {
  try {
    await connectDB();
    await SearchHistory.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search history DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
