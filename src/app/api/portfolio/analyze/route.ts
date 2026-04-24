import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';
import PortfolioAnalysis from '@/models/PortfolioAnalysis';
import { calculateIndicators, OHLCV } from '@/lib/technical-indicators';
import { enrichStockWithCalculations, calculateRealizedPL } from '@/lib/utils';
import { IStock, Market, Sale } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function fetchHistory(symbol: string, market: Market): Promise<OHLCV[]> {
  const yahooSymbol = market === 'TW' ? `${symbol}.TW` : symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol,
  )}?interval=1d&range=6mo`;

  const tryFetch = async (urlToUse: string) => {
    const res = await fetch(urlToUse, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return null;

    const candles: OHLCV[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close[i] === null) continue;
      candles.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quote.open[i] || 0,
        high: quote.high[i] || 0,
        low: quote.low[i] || 0,
        close: quote.close[i] || 0,
        volume: quote.volume[i] || 0,
      });
    }
    return candles;
  };

  let candles = await tryFetch(url);
  if (!candles && market === 'TW') {
    const twoUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.TWO?interval=1d&range=6mo`;
    candles = await tryFetch(twoUrl);
  }
  return candles || [];
}

interface SaleSummary {
  date: string;
  shares: number;
  price: number;
  avgCostAtSale: number;
  pl: number;
}

interface StockAnalysis {
  status: 'held' | 'closed'; // held: 目前持有；closed: 已完全賣光
  symbol: string;
  name: string;
  market: Market;
  shares: number; // held: 持股數；closed: 0
  averagePrice: number;
  currentPrice?: number; // 現在的市價（即使已清倉也抓）
  totalCost: number; // held: 持有部位的成本；closed: 0
  totalValue?: number;
  totalProfit?: number; // 未實現
  totalProfitPercent?: number;
  purchaseCount: number;
  firstPurchaseDate?: string;
  latestPurchaseDate?: string;
  return90d?: number;
  high90d?: number;
  low90d?: number;
  rsi?: number;
  priceVsSma20?: number;
  priceVsSma60?: number;
  volatility?: number;
  saleCount: number;
  realizedPL: number; // 已實現
  totalSharesSold?: number;
  firstSaleDate?: string;
  lastSaleDate?: string;
  recentSales: SaleSummary[];
}

function renderStockSection(s: StockAnalysis, i: number): string {
  const currency = s.market === 'TW' ? 'NT$' : 'US$';
  const marketLabel = s.market === 'TW' ? '台股' : '美股';

  const salesLine =
    s.saleCount > 0
      ? `- 賣出紀錄：${s.saleCount} 次（${s.firstSaleDate} ~ ${s.lastSaleDate}），累計已實現損益 ${currency} ${s.realizedPL.toFixed(0)}`
      : '- 賣出紀錄：無';

  const recentSalesLine =
    s.recentSales.length > 0
      ? '- 最近賣出（最多 5 筆）：\n' +
        s.recentSales
          .map(
            (x) =>
              `  · ${x.date} 賣 ${x.shares} 股 @ ${currency} ${x.price.toFixed(2)}（當下成本 ${currency} ${x.avgCostAtSale.toFixed(2)}，單筆損益 ${currency} ${x.pl.toFixed(0)}）`,
          )
          .join('\n')
      : '';

  if (s.status === 'held') {
    const plSign = (s.totalProfit || 0) >= 0 ? '獲利' : '虧損';
    return `
### ${i + 1}. ${s.symbol} ${s.name}（${marketLabel}）· 目前持有
- 持有股數：${s.shares} 股，平均成本 ${currency} ${s.averagePrice.toFixed(2)}，現價 ${currency} ${s.currentPrice?.toFixed(2) ?? '-'}
- 持倉成本 ${currency} ${s.totalCost.toFixed(0)}，市值 ${currency} ${s.totalValue?.toFixed(0) ?? '-'}
- 未實現 ${plSign} ${currency} ${Math.abs(s.totalProfit || 0).toFixed(0)}（${s.totalProfitPercent?.toFixed(2)}%）
- 買入次數：${s.purchaseCount} 次（${s.firstPurchaseDate} ~ ${s.latestPurchaseDate}）
- 近 90 天：漲跌 ${s.return90d?.toFixed(2)}%，最高 ${currency} ${s.high90d?.toFixed(2)}，最低 ${currency} ${s.low90d?.toFixed(2)}，波動度 ${s.volatility?.toFixed(2)}%
- 技術面：RSI(14) ${s.rsi?.toFixed(1)}，離 20 日均 ${s.priceVsSma20?.toFixed(2)}%，離 60 日均 ${s.priceVsSma60?.toFixed(2)}%
${salesLine}
${recentSalesLine}
`.trim();
  }

  // closed
  return `
### ${i + 1}. ${s.symbol} ${s.name}（${marketLabel}）· 已清倉
- 買入次數：${s.purchaseCount} 次（${s.firstPurchaseDate} ~ ${s.latestPurchaseDate}），總買進 ${s.shares === 0 ? s.totalSharesSold : '-'} 股
- 已完全賣光，現價（參考）${currency} ${s.currentPrice?.toFixed(2) ?? '-'}
- 近 90 天（自大盤角度）：漲跌 ${s.return90d?.toFixed(2)}%，最高 ${currency} ${s.high90d?.toFixed(2)}，最低 ${currency} ${s.low90d?.toFixed(2)}，波動度 ${s.volatility?.toFixed(2)}%
- 技術面（參考）：RSI(14) ${s.rsi?.toFixed(1)}，離 20 日均 ${s.priceVsSma20?.toFixed(2)}%
${salesLine}
${recentSalesLine}
`.trim();
}

function buildPrompt(
  held: StockAnalysis[],
  closed: StockAnalysis[],
  totals: {
    totalCostTWD: number;
    totalValueTWD: number;
    totalUnrealizedPLTWD: number;
    totalUnrealizedPLPercent: number;
    totalRealizedPLTWD: number;
    totalCombinedPLTWD: number;
    usdRate: number;
  },
  previousAnalysis?: { date: string; title: string; snippet: string },
): string {
  const heldText = held.length > 0
    ? held.map((s, i) => renderStockSection(s, i)).join('\n\n')
    : '（目前沒有任何持股）';

  const closedText = closed.length > 0
    ? closed.map((s, i) => renderStockSection(s, i)).join('\n\n')
    : '';

  const previousSection = previousAnalysis
    ? `\n## 上次分析（${previousAnalysis.date}）重點\n「${previousAnalysis.title}」\n${previousAnalysis.snippet}\n請在本次分析中適當對照上次建議，指出使用者有無照做、組合有何變化。\n`
    : '';

  const closedSection = closed.length > 0
    ? `\n## 最近 90 天內已清倉的股票（參考交易行為，非目前持股）\n${closedText}\n`
    : '';

  return `你是一位像朋友一樣說話的投資組合顧問。使用者是一般散戶，請用白話、不要用術語（RSI、MACD、KD、β、Sharpe 這些都不要出現）。請用繁體中文回答。

## 🚫 絕對禁止
- 不得預測股價漲跌（例如：「下週會漲」「會跌到 XX」）
- 不得給具體買賣指令（例如：「建議買 AAPL」「賣掉 NVDA」）
- 技術指標只用白話描述（例如「最近短期漲多了」「離均線偏遠」），不要出現 RSI、MACD 等字眼

## ✅ 可以做的
- 評估組合集中度風險、分散度、幣別配置
- 描述近期表現（波動、相對大盤）
- 每個「需要調整」配 2~3 個具體做法 (A)(B)(C) 讓使用者選擇
- 指出成本結構問題（買太高、攤平太多次等）
- 評論使用者的交易習慣（是否常在虧損時砍、獲利太早跑、進出頻繁等）
- 對比已清倉部位的賣出價和現在價，點出賣得太早 / 太晚的模式

## 使用者的資產快照（統一換算台幣）
- 目前持股總成本：NT$ ${totals.totalCostTWD.toFixed(0)}
- 目前持股總市值：NT$ ${totals.totalValueTWD.toFixed(0)}
- **未實現損益**：NT$ ${totals.totalUnrealizedPLTWD.toFixed(0)}（${totals.totalUnrealizedPLPercent.toFixed(2)}%）
- **已實現損益（含所有賣出紀錄）**：NT$ ${totals.totalRealizedPLTWD.toFixed(0)}
- **合計損益（實現 + 未實現）**：NT$ ${totals.totalCombinedPLTWD.toFixed(0)}
- 匯率：USD/TWD = ${totals.usdRate.toFixed(2)}
${previousSection}
## 目前持股細節
${heldText}
${closedSection}

---

## 📋 請嚴格依以下格式回答（繁體中文 markdown）

# [標題：10 字以內，概括這次組合最關鍵的發現]

## 🎯 組合總評
2-3 段，像朋友聊天那樣講使用者目前整個組合的狀況。**把未實現、已實現、合計損益都提一下**，講集中度、整體風險程度。

## 📊 分散度分析
- **產業集中度**：哪個產業占比過高，有什麼風險
- **市場配置**：台股 vs 美股比例，幣別風險
- **個股集中度**：單一檔占比 > 40% 要明確提出

如果需要調整，給 2~3 個具體方案（分批減倉 / 新資金優先買其他產業等），每個方案寫清楚怎麼做。

## 🔍 個股逐檔快評
每檔**目前持股**用一段話（3~5 句）講：
- 目前成本 vs 現價
- 近期表現
- 有無明顯觀察點
- 2~3 個選項讓使用者選
${closed.length > 0 ? '\n**已清倉的股票**另起一段，評論交易結果：賺賠如何、賣得太早或太晚（對比目前價）、有無明顯的好壞習慣。\n' : ''}

## 📈 近 90 天組合復盤
描述這段時間整體發生什麼、最亮眼 / 最糟糕的是哪一檔、已實現和未實現的表現差距。

## 🧠 交易習慣觀察
根據所有買賣紀錄，指出 1~2 個你觀察到的習慣（例如「虧損時太快砍」「買太高又攤平」「賺一點就跑」等），用朋友口吻給 2~3 個調整建議。

${previousAnalysis ? '## 🔄 跟上次相比\n對照上次分析，指出使用者做了什麼、組合如何變化、哪些建議還沒處理。\n\n' : ''}## ⚠️ 提醒
2~3 句重要的風險提醒。

---
⚠️ 免責聲明：以上僅供參考，不構成投資建議。`;
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+?)$/m);
  if (match) return match[1].trim().slice(0, 30);
  return '組合分析';
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '未設定 OPENAI_API_KEY' }, { status: 500 });
    }

    await connectDB();

    // 1. 抓使用者持股（過濾 totalShares > 0）
    const stocksRaw = await Stock.find({}).lean<IStock[]>();

    // 2. 抓匯率
    let usdRate = 0;
    try {
      const rateUrl = `https://query1.finance.yahoo.com/v8/finance/chart/TWD%3DX?interval=1d&range=1d`;
      const rateRes = await fetch(rateUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
      if (rateRes.ok) {
        const rateJson = await rateRes.json();
        usdRate = rateJson?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
      }
    } catch { /* ignore */ }

    // 3. 篩選要分析的股票：有持股 OR 最近 90 天內有賣出紀錄
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - NINETY_DAYS_MS;

    const stocksToAnalyze = stocksRaw
      .filter((stock) => {
        const totalShares = (stock.purchases || []).reduce((s, p) => s + p.shares, 0) -
          (stock.sales || []).reduce((s, x) => s + x.shares, 0);
        if (totalShares > 0) return true;
        // 已清倉 → 需最近 90 天內有賣出
        const sales = stock.sales || [];
        const lastSale = sales.reduce(
          (acc, s) => Math.max(acc, new Date(s.date).getTime()),
          0,
        );
        return lastSale >= cutoff;
      })
      .slice(0, 20);

    const stockPromises = stocksToAnalyze.map(async (stock): Promise<StockAnalysis | null> => {
      const candles = await fetchHistory(stock.symbol, stock.market);
      if (candles.length < 20) return null;

      const currentPrice = candles[candles.length - 1].close;
      const enriched = enrichStockWithCalculations(stock, currentPrice);
      const indicators = calculateIndicators(candles);

      // 90 天視窗
      const last90 = candles.slice(-90);
      const high90d = Math.max(...last90.map((c) => c.high));
      const low90d = Math.min(...last90.map((c) => c.low));
      const firstClose = last90[0]?.close || currentPrice;
      const return90d = firstClose > 0 ? ((currentPrice - firstClose) / firstClose) * 100 : 0;
      const closes90 = last90.map((c) => c.close);
      const mean = closes90.reduce((a, b) => a + b, 0) / closes90.length;
      const variance = closes90.reduce((s, c) => s + (c - mean) ** 2, 0) / closes90.length;
      const stdDev = Math.sqrt(variance);
      const volatility = mean > 0 ? (stdDev / mean) * 100 : 0;

      const purchases = stock.purchases || [];
      const sortedPurchases = [...purchases].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const firstPurchaseDate = sortedPurchases[0]?.date
        ? new Date(sortedPurchases[0].date).toISOString().split('T')[0]
        : undefined;
      const latestPurchaseDate = sortedPurchases[sortedPurchases.length - 1]?.date
        ? new Date(sortedPurchases[sortedPurchases.length - 1].date).toISOString().split('T')[0]
        : undefined;

      const sales = (stock.sales || []) as Sale[];
      const sortedSales = [...sales].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const firstSaleDate = sortedSales[0]?.date
        ? new Date(sortedSales[0].date).toISOString().split('T')[0]
        : undefined;
      const lastSaleDate = sortedSales[sortedSales.length - 1]?.date
        ? new Date(sortedSales[sortedSales.length - 1].date).toISOString().split('T')[0]
        : undefined;
      const totalSharesSold = sales.reduce((s, x) => s + x.shares, 0);

      // 最近 5 筆賣出（倒序）
      const recentSales: SaleSummary[] = [...sortedSales]
        .reverse()
        .slice(0, 5)
        .map((s) => {
          const sellProceeds = s.price * s.shares - (s.commission || 0) - (s.tax || 0);
          const buyCost = s.avgCostAtSale * s.shares;
          return {
            date: new Date(s.date).toISOString().split('T')[0],
            shares: s.shares,
            price: s.price,
            avgCostAtSale: s.avgCostAtSale,
            pl: sellProceeds - buyCost,
          };
        });

      const status: 'held' | 'closed' = enriched.totalShares > 0 ? 'held' : 'closed';

      const result: StockAnalysis = {
        status,
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        shares: enriched.totalShares,
        averagePrice: enriched.averagePrice,
        currentPrice,
        totalCost: enriched.totalCost,
        totalValue: enriched.totalValue,
        totalProfit: enriched.totalProfit,
        totalProfitPercent: enriched.totalProfitPercent,
        purchaseCount: purchases.length,
        firstPurchaseDate,
        latestPurchaseDate,
        return90d,
        high90d,
        low90d,
        rsi: indicators.rsi14,
        priceVsSma20: indicators.priceVsSma20,
        priceVsSma60: indicators.priceVsSma60,
        volatility,
        saleCount: sales.length,
        realizedPL: calculateRealizedPL(sales),
        totalSharesSold,
        firstSaleDate,
        lastSaleDate,
        recentSales,
      };
      return result;
    });

    const stockResults = await Promise.all(stockPromises);
    const allStocks = stockResults.filter((s): s is StockAnalysis => s !== null);
    const held = allStocks.filter((s) => s.status === 'held');
    const closed = allStocks.filter((s) => s.status === 'closed');

    if (allStocks.length === 0) {
      return NextResponse.json(
        { error: '沒有可分析的股票（歷史資料不足 or 無持股無近期賣出）' },
        { status: 400 },
      );
    }

    // 4. 計算組合 totals（統一台幣，含實現 + 未實現）
    const toTWD = (amount: number, market: Market) =>
      market === 'US' && usdRate > 0 ? amount * usdRate : amount;

    const totalCostTWD = held.reduce((sum, h) => sum + toTWD(h.totalCost, h.market), 0);
    const totalValueTWD = held.reduce((sum, h) => sum + toTWD(h.totalValue || 0, h.market), 0);
    const totalUnrealizedPLTWD = totalValueTWD - totalCostTWD;
    const totalUnrealizedPLPercent = totalCostTWD > 0 ? (totalUnrealizedPLTWD / totalCostTWD) * 100 : 0;
    const totalRealizedPLTWD = allStocks.reduce(
      (sum, s) => sum + toTWD(s.realizedPL, s.market),
      0,
    );
    const totalCombinedPLTWD = totalUnrealizedPLTWD + totalRealizedPLTWD;

    // 5. 撈上一次分析（>= 3 天前）當作 context
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const previousDoc = await PortfolioAnalysis.findOne({ createdAt: { $lte: threeDaysAgo } })
      .sort({ createdAt: -1 })
      .lean<{ title: string; analysis: string; createdAt: Date } | null>();
    const previousAnalysis = previousDoc
      ? {
          date: new Date(previousDoc.createdAt).toISOString().split('T')[0],
          title: previousDoc.title,
          snippet: previousDoc.analysis.replace(/^#.+$/m, '').trim().slice(0, 600),
        }
      : undefined;

    // 6. 組 prompt + 呼叫 OpenAI
    const prompt = buildPrompt(
      held,
      closed,
      {
        totalCostTWD,
        totalValueTWD,
        totalUnrealizedPLTWD,
        totalUnrealizedPLPercent,
        totalRealizedPLTWD,
        totalCombinedPLTWD,
        usdRate,
      },
      previousAnalysis,
    );

    // 內部 fetch Edge 代理（Node.js IP 會被 OpenAI 擋，必須走 Edge）
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = host.startsWith('localhost') ? `http://${host}` : `${protocol}://${host}`;

    const openaiRes = await fetch(`${baseUrl}/api/portfolio/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemMessage:
          '你是一位說白話的台灣投資組合顧問，像朋友聊天那樣給建議。嚴禁預測股價漲跌、嚴禁給具體買賣指令，只能給風險分析與多選項建議。請用繁體中文、Markdown 回答。',
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      const errMsg = errData?.error || `OpenAI 代理錯誤 (${openaiRes.status})`;
      return NextResponse.json({ error: errMsg }, { status: openaiRes.status });
    }

    const { analysis } = await openaiRes.json();

    if (!analysis) {
      return NextResponse.json({ error: 'AI 回應為空' }, { status: 500 });
    }

    // 7. 存 DB（snapshot 只記錄目前持股，已清倉不存 snapshot）
    const title = extractTitle(analysis);
    const snapshot = held.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      market: h.market,
      totalShares: h.shares,
      averagePrice: h.averagePrice,
      currentPrice: h.currentPrice,
      totalCost: h.totalCost,
      totalValue: h.totalValue,
      totalProfit: h.totalProfit,
      totalProfitPercent: h.totalProfitPercent,
    }));

    const saved = await PortfolioAnalysis.create({
      title,
      snapshot,
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
    console.error('Portfolio analyze error:', error);
    const message = error instanceof Error ? error.message : '分析失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
