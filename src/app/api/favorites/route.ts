import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';

// 取得所有自選股票
export async function GET() {
  try {
    await connectDB();
    const favorites = await Favorite.find().sort({ sortOrder: 1, addedAt: -1 }).lean();
    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Favorites GET error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// 加入自選
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { symbol, name, market } = await request.json();

    if (!symbol || !name || !market) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 檢查是否已存在
    const existing = await Favorite.findOne({ symbol, market });
    if (existing) {
      existing.name = name;
      existing.addedAt = new Date();
      await existing.save();
    } else {
      // 新增時 sortOrder 設為最大值 +1
      const maxDoc = await Favorite.findOne({}).sort({ sortOrder: -1 }).lean();
      const nextOrder = (maxDoc?.sortOrder ?? -1) + 1;
      await Favorite.create({ symbol, name, market, addedAt: new Date(), sortOrder: nextOrder });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorites POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// 移除自選
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market');

    if (!symbol || !market) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await Favorite.findOneAndDelete({ symbol, market });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
