import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    // 批次更新每個 stock 的 sortOrder
    const bulkOps = orderedIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    await Stock.bulkWrite(bulkOps);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/stocks/reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder stocks' }, { status: 500 });
  }
}
