import { NextRequest, NextResponse } from 'next/server';
import { calculateIndicators, OHLCV } from '@/lib/technical-indicators';
import { Market } from '@/types';

export const runtime = 'edge';
export const preferredRegion = 'iad1';


async function fetchHistoricalData(symbol: string, market: Market): Promise<OHLCV[]> {
  const yahooSymbol = market === 'TW' ? `${symbol}.TW` : symbol;
  // 抓 6 個月的日 K 線（確保 120 日均線有足夠資料）
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!res.ok) {
    // 台股可能是上櫃 (.TWO)
    if (market === 'TW') {
      const twoUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.TWO?interval=1d&range=6mo`;
      const twoRes = await fetch(twoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (!twoRes.ok) throw new Error('無法取得歷史價格');
      return parseChartData(await twoRes.json());
    }
    throw new Error('無法取得歷史價格');
  }

  return parseChartData(await res.json());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseChartData(data: any): OHLCV[] {
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo Finance 回傳格式錯誤');

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) throw new Error('無 K 線資料');

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
  position?: PositionInfo
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

  return `你是一位說話直白的股票分析師朋友。我是一般散戶，不懂太多專業術語。請根據技術指標幫我分析這檔股票，用聊天的口氣告訴我該怎麼做。

## 股票資訊
- 代碼：${symbol}（${name}）
- 市場：${market === 'TW' ? '台股' : '美股'}
- 目前價格：${currency} ${indicators.currentPrice}
- 今日漲跌：${indicators.change}（${indicators.changePercent}%）
${positionSection}
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

### ⚠️ 要注意的事
用 2-3 句話提醒我最重要的風險或機會，像朋友聊天一樣說。

---
⚠️ 免責聲明：以上分析僅供參考，不構成投資建議。投資有風險，請自行判斷。`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '未設定 OPENAI_API_KEY' }, { status: 500 });
    }

    const { symbol, name, market, averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice } = await request.json();
    if (!symbol || !market) {
      return NextResponse.json({ error: '缺少 symbol 或 market' }, { status: 400 });
    }

    // 1. 抓歷史資料
    const candles = await fetchHistoricalData(symbol, market as Market);
    if (candles.length < 30) {
      return NextResponse.json({ error: '歷史資料不足，無法分析' }, { status: 400 });
    }

    // 2. 計算技術指標
    const indicators = calculateIndicators(candles);
    const prompt = buildPrompt(symbol, name || symbol, market as Market, indicators, {
      averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice,
    });

    // 3. 呼叫 OpenAI（直接用 fetch）
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是一位說話直白的台灣股票分析師，像朋友聊天一樣給建議。不要用專業術語，要用一般人聽得懂的話。請用繁體中文回答。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      console.error('OpenAI API error:', JSON.stringify(errData));
      const errMsg = errData?.error?.message || `OpenAI API 錯誤 (${openaiRes.status})`;
      return NextResponse.json({ error: errMsg }, { status: openaiRes.status });
    }

    const openaiData = await openaiRes.json();
    const analysis = openaiData?.choices?.[0]?.message?.content || '分析失敗';

    return NextResponse.json({
      analysis,
      indicators,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stock analysis error:', error);
    const message = error instanceof Error ? error.message : '分析失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
