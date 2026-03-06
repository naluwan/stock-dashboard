import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Alert from '@/models/Alert';

export async function GET() {
  try {
    await connectDB();
    const alerts = await Alert.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('GET /api/alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const alert = await Alert.create(body);
    return NextResponse.json(alert.toObject(), { status: 201 });
  } catch (error) {
    console.error('POST /api/alerts error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { _id, ...updateData } = body;

    const alert = await Alert.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json(alert.toObject());
  } catch (error) {
    console.error('PUT /api/alerts error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
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

    await Alert.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/alerts error:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
