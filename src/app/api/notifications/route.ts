import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NotificationConfig from '@/models/NotificationConfig';

export async function GET() {
  try {
    await connectDB();
    let config = await NotificationConfig.findOne({}).lean();

    if (!config) {
      config = await NotificationConfig.create({
        email: { enabled: false, smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', recipients: [] },
        line: { enabled: false, channelAccessToken: '', channelSecret: '', recipients: [] },
      });
      config = config.toObject();
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notification config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    let config = await NotificationConfig.findOne({});

    if (!config) {
      config = await NotificationConfig.create(body);
    } else {
      if (body.email) config.email = body.email;
      if (body.line) config.line = body.line;
      await config.save();
    }

    return NextResponse.json(config.toObject());
  } catch (error) {
    console.error('PUT /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to update notification config' }, { status: 500 });
  }
}
