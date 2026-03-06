import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';

export async function GET() {
  try {
    await connectDB();
    const stocks = await Stock.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('GET /api/stocks error:', error);
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { symbol, name, market, purchases } = body;

    const existingStock = await Stock.findOne({ symbol: symbol.toUpperCase(), market });
    if (existingStock) {
      existingStock.name = name;
      existingStock.purchases.push(...purchases);
      await existingStock.save();
      return NextResponse.json(existingStock.toObject());
    }

    const stock = await Stock.create({
      symbol: symbol.toUpperCase(),
      name,
      market,
      purchases,
    });

    return NextResponse.json(stock.toObject(), { status: 201 });
  } catch (error) {
    console.error('POST /api/stocks error:', error);
    return NextResponse.json({ error: 'Failed to create stock' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { _id, name, purchases } = body;

    const stock = await Stock.findByIdAndUpdate(
      _id,
      { name, purchases },
      { new: true, runValidators: true }
    );

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    return NextResponse.json(stock.toObject());
  } catch (error) {
    console.error('PUT /api/stocks error:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await Stock.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/stocks error:', error);
    return NextResponse.json({ error: 'Failed to delete stock' }, { status: 500 });
  }
}
