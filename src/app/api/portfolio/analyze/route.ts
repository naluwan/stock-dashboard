import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Stock from '@/models/Stock';
import PortfolioAnalysis from '@/models/PortfolioAnalysis';
import { calculateIndicators, OHLCV } from '@/lib/technical-indicators';
import { enrichStockWithCalculations } from '@/lib/utils';
import { IStock, Market } from '@/types';

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

interface HoldingWithIndicators {
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  averagePrice: number;
  currentPrice?: number;
  totalCost: number;
  totalValue?: number;
  totalProfit?: number;
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
}

function buildPrompt(
  holdings: HoldingWithIndicators[],
  totals: {
    totalCostTWD: number;
    totalValueTWD: number;
    totalPLTWD: number;
    totalPLPercent: number;
    usdRate: number;
  },
  previousAnalysis?: { date: string; title: string; snippet: string },
): string {
  const holdingsText = holdings
    .map((h, i) => {
      const currency = h.market === 'TW' ? 'NT$' : 'US$';
      const plSign = (h.totalProfit || 0) >= 0 ? '獲利' : '虧損';
      return `
### ${i + 1}. ${h.symbol} ${h.name}（${h.market === 'TW' ? '台股' : '美股'}）
- 持有股數：${h.shares} 股，平均成本 ${currency} ${h.averagePrice.toFixed(2)}，現價 ${currency} ${h.currentPrice?.toFixed(2) ?? '-'}
- 成本 ${currency} ${h.totalCost.toFixed(0)}，市值 ${currency} ${h.totalValue?.toFixed(0) ?? '-'}
- ${plSign} ${currency} ${Math.abs(h.totalProfit || 0).toFixed(0)}（${h.totalProfitPercent?.toFixed(2)}%）
- 買入次數：${h.purchaseCount} 次（${h.firstPurchaseDate} ~ ${h.latestPurchaseDate}）
- 近 90 天：漲跌 ${h.return90d?.toFixed(2)}%，最高 ${currency} ${h.high90d?.toFixed(2)}，最低 ${currency} ${h.low90d?.toFixed(2)}，波動度 ${h.volatility?.toFixed(2)}%
- 技術面：RSI(14) ${h.rsi?.toFixed(1)}，離 20 日均 ${h.priceVsSma20?.toFixed(2)}%，離 60 日均 ${h.priceVsSma60?.toFixed(2)}%
`.trim();
    })
    .join('\n\n');

  const previousSection = previousAnalysis
    ? `\n## 上次分析（${previousAnalysis.date}）重點\n「${previousAnalysis.title}」\n${previousAnalysis.snippet}\n請在本次分析中適當對照上次建議，指出使用者有無照做、組合有何變化。\n`
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

## 使用者的資產快照（統一換算台幣）
- 總成本：NT$ ${totals.totalCostTWD.toFixed(0)}
- 總市值：NT$ ${totals.totalValueTWD.toFixed(0)}
- 總損益：NT$ ${totals.totalPLTWD.toFixed(0)}（${totals.totalPLPercent.toFixed(2)}%）
- 匯率：USD/TWD = ${totals.usdRate.toFixed(2)}
${previousSection}
## 各檔持股細節
${holdingsText}

---

## 📋 請嚴格依以下格式回答（繁體中文 markdown）

# [標題：10 字以內，概括這次組合最關鍵的發現，例如「半導體持倉偏高」]

## 🎯 組合總評
2-3 段，像朋友聊天那樣講使用者目前整個組合的狀況。把總損益、集中度、整體風險程度講清楚。

## 📊 分散度分析
- **產業集中度**：用白話說哪個產業占比過高，有什麼風險
- **市場配置**：台股 vs 美股比例，幣別風險
- **個股集中度**：如果單一檔占比 > 40% 要明確提出

如果需要調整，給 2~3 個具體方案（分批減倉 / 新資金優先買其他產業等），每個方案寫清楚怎麼做。

## 🔍 個股逐檔快評
每檔股票用一段話（3~5 句）講：
- 目前成本 vs 現價的狀況
- 近期表現（漲多/跌多/整理）
- 是否有明顯的觀察點（大幅虧損、買太多次、離均價太遠等）
- 如果有建議，給 2~3 個選項讓使用者選

## 📈 近 90 天組合復盤
描述這段時間組合整體發生什麼、最亮眼和最糟糕的是哪一檔、波動是否合理。

${previousAnalysis ? '## 🔄 跟上次相比\n對照上次分析的建議，指出使用者做了什麼、組合如何變化、哪些建議還沒處理。\n\n' : ''}## ⚠️ 提醒
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

    // 3. 對每檔抓 6 個月歷史 + 算指標（限前 20 檔避免超時）
    const stocksToAnalyze = stocksRaw.slice(0, 20);
    const holdingsPromises = stocksToAnalyze.map(async (stock) => {
      const candles = await fetchHistory(stock.symbol, stock.market);
      if (candles.length < 20) return null;

      const currentPrice = candles[candles.length - 1].close;
      const enriched = enrichStockWithCalculations(stock, currentPrice);
      if (enriched.totalShares <= 0) return null;

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

      const result: HoldingWithIndicators = {
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
      };
      return result;
    });

    const holdingsResults = await Promise.all(holdingsPromises);
    const holdings = holdingsResults.filter((h): h is HoldingWithIndicators => h !== null);

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: '目前沒有持股（或歷史資料不足），無法分析' },
        { status: 400 },
      );
    }

    // 4. 計算組合 totals（統一台幣）
    const toTWD = (amount: number, market: Market) =>
      market === 'US' && usdRate > 0 ? amount * usdRate : amount;

    const totalCostTWD = holdings.reduce((sum, h) => sum + toTWD(h.totalCost, h.market), 0);
    const totalValueTWD = holdings.reduce((sum, h) => sum + toTWD(h.totalValue || 0, h.market), 0);
    const totalPLTWD = totalValueTWD - totalCostTWD;
    const totalPLPercent = totalCostTWD > 0 ? (totalPLTWD / totalCostTWD) * 100 : 0;

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
      holdings,
      { totalCostTWD, totalValueTWD, totalPLTWD, totalPLPercent, usdRate },
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

    // 7. 存 DB
    const title = extractTitle(analysis);
    const snapshot = holdings.map((h) => ({
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
