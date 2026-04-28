import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockAnalysisRecord from '@/models/StockAnalysisRecord';
import { calculateIndicators, OHLCV } from '@/lib/technical-indicators';
import { Market } from '@/types';

export const runtime = 'nodejs';

async function fetchHistoricalData(symbol: string, market: Market): Promise<OHLCV[]> {
  const yahooSymbol = market === 'TW' ? `${symbol}.TW` : symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parse = (data: any): OHLCV[] => {
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return [];
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

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (res.ok) {
    const candles = parse(await res.json());
    if (candles.length > 0) return candles;
  }

  if (market === 'TW') {
    const twoUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.TWO?interval=1d&range=6mo`;
    const twoRes = await fetch(twoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (twoRes.ok) return parse(await twoRes.json());
  }
  return [];
}

interface PositionInfo {
  averagePrice?: number;
  totalShares?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
  currentPrice?: number;
}

function buildPrompt(
  symbol: string,
  name: string,
  market: Market,
  indicators: ReturnType<typeof calculateIndicators>,
  position: PositionInfo | undefined,
  previousAnalysis: { date: string; snippet: string } | undefined,
): string {
  const { macd, kd, bollinger } = indicators;
  const currency = market === 'TW' ? 'NT$' : 'US$';

  const positionSection = position?.totalShares && position.totalShares > 0
    ? `
## 我目前的持股狀況
- 持有股數：${position.totalShares} 股
- 平均買入成本：${currency} ${position.averagePrice?.toFixed(2)}
- 目前股價：${currency} ${position.currentPrice?.toFixed(2)}
- 目前損益：${currency} ${position.totalProfit?.toFixed(0)}（${position.totalProfitPercent?.toFixed(2)}%）
- 狀態：${(position.totalProfit || 0) >= 0 ? '獲利中' : '虧損中'}
`
    : `
## 我目前的持股狀況
- 尚未持有此股票
`;

  const previousSection = previousAnalysis
    ? `\n## 上次分析（${previousAnalysis.date}）摘要\n${previousAnalysis.snippet}\n\n請在本次分析中**對照上次的看法**，指出哪些觀點仍然成立、哪些已經改變、目前該股票相較上次有什麼變化。\n`
    : '';

  return `你是一位說話直白的股票分析師朋友。我是一般散戶，不懂太多專業術語。請根據技術指標幫我分析這檔股票，用聊天的口氣告訴我該怎麼做。

## 股票資訊
- 代碼：${symbol}（${name}）
- 市場：${market === 'TW' ? '台股' : '美股'}
- 目前價格：${currency} ${indicators.currentPrice}
- 今日漲跌：${indicators.change}（${indicators.changePercent}%）
${positionSection}${previousSection}
## 技術指標數據

均線：5日=${indicators.sma5}, 10日=${indicators.sma10}, 20日=${indicators.sma20}, 60日=${indicators.sma60}, 120日=${indicators.sma120}
股價距離20日均線：${indicators.priceVsSma20}%, 距離60日均線：${indicators.priceVsSma60}%
RSI(14)：${indicators.rsi14}
MACD：DIF=${macd.macd}, 訊號線=${macd.signal}, 柱狀圖=${macd.histogram}
KD：K=${kd.k}, D=${kd.d}
布林通道：上軌=${bollinger.upper}, 中軌=${bollinger.middle}, 下軌=${bollinger.lower}, 帶寬=${bollinger.bandwidth}%
成交量：20日均量=${indicators.volumeAvg20}, 最新量=${indicators.volumeLatest}, 量比=${indicators.volumeRatio}
20日高低：最高=${indicators.high20}, 最低=${indicators.low20}
60日高低：最高=${indicators.high60}, 最低=${indicators.low60}
近期報酬：5日=${indicators.return5d}%, 20日=${indicators.return20d}%, 60日=${indicators.return60d}%
近5日：${indicators.recentCandles.map(c => `${c.date} 收${c.close} 量${c.volume}`).join(' / ')}

---

## 請你幫我做以下分析，用白話文回答，不要用「偏多」「偏空」「減碼」這些術語：

請依據均線、RSI、MACD、KD、布林通道、成交量、海龜突破、動能、葛蘭碧法則、支撐壓力等策略來綜合分析。

## 回答格式（請嚴格按照以下格式）：

### 📊 策略分析總表

| 策略 | 結論 | 白話解釋 |
|------|------|----------|
| 均線 | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| RSI | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| MACD | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| KD | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| 布林通道 | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| 成交量 | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| 海龜突破 | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| 動能 | 看漲/看跌/持平 | 用一句簡單的話解釋 |
| 葛蘭碧法則 | 看漲/看跌/持平 | 用一句簡單的話解釋 |

### 🎯 我的結論

**接下來會漲還是跌？**
直接告訴我短期（1-2週）和中期（1-3個月）的趨勢方向，用「會漲」「會跌」「不好說」來回答。

**現在可以買嗎？**
${position?.totalShares && position.totalShares > 0
    ? '我已經持有了，告訴我該繼續抱著、該賣掉、還是可以再加碼買更多。如果要加碼，建議在什麼價位買。'
    : '我還沒買，告訴我現在適不適合進場，如果要買建議等到什麼價位再買。'}

### 💰 具體價位建議

- **適合買進的價位：** ${currency} ___（跌到這個價再買比較安全）
- **目標獲利價位：** ${currency} ___（漲到這裡可以考慮賣）
- **停損價位：** ${currency} ___（跌破這裡就該跑了）

${previousAnalysis ? '### 🔄 跟上次相比\n對照上次分析，指出股價、技術面、整體看法的主要變化（2~3 句話）。\n\n' : ''}### ⚠️ 要注意的事
用 2-3 句話提醒我最重要的風險或機會，像朋友聊天一樣說。

---
⚠️ 免責聲明：以上分析僅供參考，不構成投資建議。投資有風險，請自行判斷。`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, name, market, averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice } = body;

    if (!symbol || !market) {
      return NextResponse.json({ error: '缺少 symbol 或 market' }, { status: 400 });
    }

    // 1. 抓歷史資料 + 算指標
    const candles = await fetchHistoricalData(symbol, market as Market);
    if (candles.length < 30) {
      return NextResponse.json({ error: '歷史資料不足，無法分析' }, { status: 400 });
    }
    const indicators = calculateIndicators(candles);

    // 2. 撈上次分析（>= 3 天前）
    await connectDB();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const previousDoc = await StockAnalysisRecord.findOne({
      symbol: symbol.toUpperCase(),
      market,
      createdAt: { $lte: threeDaysAgo },
    })
      .sort({ createdAt: -1 })
      .lean<{ analysis: string; createdAt: Date } | null>();

    const previousAnalysis = previousDoc
      ? {
          date: new Date(previousDoc.createdAt).toISOString().split('T')[0],
          // 取結論段，避免太長
          snippet: previousDoc.analysis.slice(0, 800),
        }
      : undefined;

    // 3. 組 prompt
    const prompt = buildPrompt(
      symbol,
      name || symbol,
      market as Market,
      indicators,
      { averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice },
      previousAnalysis,
    );

    // 4. 回傳 prompt + 快照（snapshot 用於存 DB 時記錄當下狀態）
    const snapshot = {
      currentPrice: indicators.currentPrice,
      averagePrice,
      totalShares,
      totalProfit,
      totalProfitPercent,
      rsi: indicators.rsi14,
      return5d: indicators.return5d,
      return20d: indicators.return20d,
      return60d: indicators.return60d,
    };

    return NextResponse.json({ prompt, snapshot, indicators });
  } catch (error) {
    console.error('Stock analysis prepare error:', error);
    const message = error instanceof Error ? error.message : '準備失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
