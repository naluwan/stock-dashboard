import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PortfolioAnalysis from '@/models/PortfolioAnalysis';

export const runtime = 'nodejs';

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+?)$/m);
  if (match) return match[1].trim().slice(0, 30);
  return '組合分析';
}

interface SnapshotItem {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  totalShares: number;
  averagePrice: number;
  currentPrice?: number;
  totalCost: number;
  totalValue?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { analysis, snapshot, usdRate } = body as {
      analysis?: string;
      snapshot?: SnapshotItem[];
      usdRate?: number;
    };

    if (!analysis || typeof analysis !== 'string') {
      return NextResponse.json({ error: '缺少 analysis 內容' }, { status: 400 });
    }

    const title = extractTitle(analysis);
    const saved = await PortfolioAnalysis.create({
      title,
      snapshot: Array.isArray(snapshot) ? snapshot : [],
      analysis,
      usdRate,
    });

    return NextResponse.json({
      _id: saved._id,
      title: saved.title,
      analysis: saved.analysis,
      snapshot: saved.snapshot,
      usdRate: saved.usdRate,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    console.error('Save analysis error:', error);
    const message = error instanceof Error ? error.message : '儲存分析失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
