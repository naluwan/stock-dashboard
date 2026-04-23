import { NextRequest, NextResponse } from 'next/server';
import { calculateIndicators, OHLCV } from '@/lib/technical-indicators';
import { Market } from '@/types';


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

function buildPrompt(
  symbol: string,
  name: string,
  market: Market,
  indicators: ReturnType<typeof calculateIndicators>
): string {
  const { macd, kd, bollinger } = indicators;

  return `你是一位專業的股票技術分析師。請根據以下技術指標，使用多種投資策略來分析這檔股票，並給出綜合建議。

## 股票資訊
- 代碼：${symbol}（${name}）
- 市場：${market === 'TW' ? '台股' : '美股'}
- 目前價格：${indicators.currentPrice}
- 漲跌：${indicators.change}（${indicators.changePercent}%）

## 技術指標

### 均線（Moving Average）
- 5日均線：${indicators.sma5}
- 10日均線：${indicators.sma10}
- 20日均線：${indicators.sma20}
- 60日均線：${indicators.sma60}
- 120日均線：${indicators.sma120}
- 股價 vs 20MA：${indicators.priceVsSma20}%
- 股價 vs 60MA：${indicators.priceVsSma60}%

### RSI（14日）
- RSI：${indicators.rsi14}

### MACD（12, 26, 9）
- MACD 線：${macd.macd}
- 訊號線：${macd.signal}
- 柱狀圖：${macd.histogram}

### KD 隨機指標（9, 3, 3）
- K 值：${kd.k}
- D 值：${kd.d}

### 布林通道（20, 2）
- 上軌：${bollinger.upper}
- 中軌：${bollinger.middle}
- 下軌：${bollinger.lower}
- 帶寬：${bollinger.bandwidth}%

### 成交量
- 20日均量：${indicators.volumeAvg20}
- 最新量：${indicators.volumeLatest}
- 量比（最新/均量）：${indicators.volumeRatio}

### 海龜交易法突破位
- 20日最高：${indicators.high20}
- 20日最低：${indicators.low20}
- 60日最高：${indicators.high60}
- 60日最低：${indicators.low60}

### 近期報酬率
- 5日：${indicators.return5d}%
- 20日：${indicators.return20d}%
- 60日：${indicators.return60d}%

### 近5日走勢
${indicators.recentCandles.map(c => `${c.date}：收${c.close}，量${c.volume}，漲跌${c.change}`).join('\n')}

---

## 請用以下策略逐一分析：

1. **均線策略**：判斷黃金交叉/死亡交叉、均線多空排列（5/10/20/60/120MA）
2. **葛蘭碧八大法則**：根據股價與均線的相對位置判斷買賣時機
3. **RSI 策略**：超買(>70)/超賣(<30)訊號，是否出現頂背離/底背離
4. **MACD 策略**：趨勢動能、柱狀圖變化方向、零軸上下、是否出現背離
5. **KD 隨機指標**：K/D 交叉方向、超買(>80)超賣(<20)、是否鈍化
6. **布林通道策略**：股價在通道中的位置、是否觸及上/下軌、帶寬收斂或擴張
7. **量價分析**：量增價漲/量縮價跌/量價背離判斷
8. **海龜交易法**：是否突破 20 日 / 60 日高低點（突破買進/跌破賣出）
9. **動能策略**：近期漲跌幅趨勢、是否出現加速或減速
10. **支撐壓力**：根據均線、布林通道、近期高低點判斷關鍵價位
11. **趨勢強度**：綜合均線排列、ADX概念、價格在通道中的位置判斷趨勢強弱

## 輸出格式（請嚴格按照以下格式回覆）：

### 📊 各策略訊號

| 策略 | 訊號 | 說明 |
|------|------|------|
| 均線 | 偏多/偏空/中性 | 一句話說明 |
| 葛蘭碧法則 | 偏多/偏空/中性 | 一句話說明 |
| RSI | 偏多/偏空/中性 | 一句話說明 |
| MACD | 偏多/偏空/中性 | 一句話說明 |
| KD | 偏多/偏空/中性 | 一句話說明 |
| 布林通道 | 偏多/偏空/中性 | 一句話說明 |
| 量價 | 偏多/偏空/中性 | 一句話說明 |
| 海龜突破 | 偏多/偏空/中性 | 一句話說明 |
| 動能 | 偏多/偏空/中性 | 一句話說明 |
| 趨勢強度 | 強/中/弱 | 一句話說明 |

### 🎯 綜合判斷

**趨勢方向：** 偏多/中性/偏空
**信心程度：** 強/中/弱
**短線建議：** 一句話操作建議（例：可逢低布局 / 觀望為宜 / 考慮減碼）

### 📌 關鍵價位
- 支撐位：___
- 壓力位：___
- 停損參考：___

### 💡 補充說明
2-3 句話的補充分析，提醒需要注意的風險或機會。

⚠️ 免責聲明：以上分析僅供參考，不構成投資建議。投資有風險，請自行判斷。`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '未設定 GEMINI_API_KEY' }, { status: 500 });
    }

    const { symbol, name, market } = await request.json();
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
    const prompt = buildPrompt(symbol, name || symbol, market as Market, indicators);

    // 3. 呼叫 Gemini（直接用 fetch）
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `你是一位專業的台灣股票技術分析師，擅長使用多種技術指標和投資策略進行分析。請用繁體中文回答。\n\n${prompt}` }],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('Gemini API error:', JSON.stringify(errData));
      const errMsg = errData?.error?.message || `Gemini API 錯誤 (${geminiRes.status})`;
      return NextResponse.json({ error: errMsg }, { status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const analysis = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '分析失敗';

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
