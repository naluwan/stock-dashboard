import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';

export const runtime = 'nodejs';

interface TraceStep {
  step: number;
  date: string;
  kind: 'buy' | 'sell';
  shares: number;
  price: number;
  commission: number;
  tax?: number;
  avgAtEvent: number;
  sharesAfter: number;
  costBasisAfter: number;
  realizedDelta?: number;
  realizedTotal: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market');
    if (!symbol || !market) {
      return NextResponse.json({ error: '缺少 symbol / market' }, { status: 400 });
    }

    await connectDB();
    const stock = await Stock.findOne({ symbol, market }).lean();
    if (!stock) return NextResponse.json({ error: '找不到該股票' }, { status: 404 });

    interface RawPurchase {
      _id?: { toString: () => string };
      date: Date;
      shares: number;
      price: number;
      commission?: number;
    }
    interface RawSale {
      _id?: { toString: () => string };
      date: Date;
      shares: number;
      price: number;
      commission?: number;
      tax?: number;
      avgCostAtSale?: number;
    }

    const s = stock as unknown as { purchases?: RawPurchase[]; sales?: RawSale[] };
    const purchases = (s.purchases || []).map((p) => ({
      _id: p._id?.toString(),
      date: new Date(p.date).toISOString().split('T')[0],
      shares: p.shares,
      price: p.price,
      commission: p.commission || 0,
    }));
    const sales = (s.sales || []).map((x) => ({
      _id: x._id?.toString(),
      date: new Date(x.date).toISOString().split('T')[0],
      shares: x.shares,
      price: x.price,
      commission: x.commission || 0,
      tax: x.tax || 0,
      avgCostAtSale_db: x.avgCostAtSale,
    }));

    type Event = {
      kind: 'buy' | 'sell';
      time: number;
      order: number;
      idx: number;
      date: string;
      shares: number;
      price: number;
      commission: number;
      tax: number;
    };

    const events: Event[] = [];
    purchases.forEach((p, idx) => events.push({
      kind: 'buy', time: new Date(p.date).getTime(), order: 0, idx,
      date: p.date, shares: p.shares, price: p.price, commission: p.commission, tax: 0,
    }));
    sales.forEach((x, idx) => events.push({
      kind: 'sell', time: new Date(x.date).getTime(), order: 1, idx,
      date: x.date, shares: x.shares, price: x.price, commission: x.commission, tax: x.tax,
    }));
    events.sort((a, b) => (a.time !== b.time ? a.time - b.time : a.order !== b.order ? a.order - b.order : a.idx - b.idx));

    const trace: TraceStep[] = [];
    let shares = 0;
    let costBasis = 0;
    let realizedPL = 0;
    let step = 0;

    for (const ev of events) {
      step += 1;
      if (ev.kind === 'buy') {
        costBasis += ev.shares * ev.price + ev.commission;
        shares += ev.shares;
        const avg = shares > 0 ? costBasis / shares : 0;
        trace.push({
          step, date: ev.date, kind: 'buy',
          shares: ev.shares, price: ev.price, commission: ev.commission,
          avgAtEvent: Number(avg.toFixed(4)),
          sharesAfter: shares,
          costBasisAfter: Number(costBasis.toFixed(2)),
          realizedTotal: Number(realizedPL.toFixed(2)),
        });
      } else {
        const avgAtSale = shares > 0 ? costBasis / shares : 0;
        const proceeds = ev.price * ev.shares - ev.commission - ev.tax;
        const realizedDelta = proceeds - avgAtSale * ev.shares;
        realizedPL += realizedDelta;
        costBasis -= avgAtSale * ev.shares;
        shares -= ev.shares;
        if (shares <= 0) { shares = 0; costBasis = 0; }
        trace.push({
          step, date: ev.date, kind: 'sell',
          shares: ev.shares, price: ev.price, commission: ev.commission, tax: ev.tax,
          avgAtEvent: Number(avgAtSale.toFixed(4)),
          sharesAfter: shares,
          costBasisAfter: Number(costBasis.toFixed(2)),
          realizedDelta: Number(realizedDelta.toFixed(2)),
          realizedTotal: Number(realizedPL.toFixed(2)),
        });
      }
    }

    const finalAvg = shares > 0 ? costBasis / shares : 0;
    return NextResponse.json({
      symbol, market,
      purchaseCount: purchases.length,
      saleCount: sales.length,
      purchases,
      sales,
      finalShares: shares,
      finalAvg: Number(finalAvg.toFixed(4)),
      finalCostBasis: Number(costBasis.toFixed(2)),
      totalRealizedPL: Number(realizedPL.toFixed(2)),
      trace,
    });
  } catch (error) {
    console.error('debug/calc error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
