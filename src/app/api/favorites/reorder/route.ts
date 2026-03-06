import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    // 批次更新每個 favorite 的 sortOrder
    const bulkOps = orderedIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    await Favorite.bulkWrite(bulkOps);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/favorites/reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder favorites' }, { status: 500 });
  }
}
