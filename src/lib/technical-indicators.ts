/**
 * 技術指標計算工具
 * 輸入：歷史 K 線資料（日期、開高低收、成交量）
 * 輸出：各種技術指標數值
 */

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  // 基本資訊
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;

  // 均線
  sma5: number;
  sma10: number;
  sma20: number;
  sma60: number;
  sma120: number;

  // RSI
  rsi14: number;

  // MACD
  macd: { macd: number; signal: number; histogram: number };

  // KD 隨機指標
  kd: { k: number; d: number };

  // 布林通道
  bollinger: { upper: number; middle: number; lower: number; bandwidth: number };

  // 成交量
  volumeAvg20: number;
  volumeLatest: number;
  volumeRatio: number; // 最近量 / 20日均量

  // 趨勢
  priceVsSma20: number; // 目前價距離20日均線 %
  priceVsSma60: number;

  // 海龜突破
  high20: number; // 20日最高
  low20: number;  // 20日最低
  high60: number;
  low60: number;

  // 近期表現
  return5d: number;  // 5日報酬率 %
  return20d: number; // 20日報酬率 %
  return60d: number; // 60日報酬率 %

  // 最近 K 線摘要（最近5天）
  recentCandles: { date: string; close: number; volume: number; change: number }[];
}

// ─── 工具函數 ───

function sma(data: number[], period: number): number {
  if (data.length < period) return NaN;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return NaN;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);

  const last = closes.length - 1;
  return {
    macd: Math.round(macdLine[last] * 100) / 100,
    signal: Math.round(signalLine[last] * 100) / 100,
    histogram: Math.round((macdLine[last] - signalLine[last]) * 100) / 100,
  };
}

function calcKD(highs: number[], lows: number[], closes: number[], period: number = 9): { k: number; d: number } {
  if (closes.length < period) return { k: 50, d: 50 };

  let k = 50;
  let d = 50;

  for (let i = period - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - period + 1, i + 1);
    const periodLows = lows.slice(i - period + 1, i + 1);
    const highest = Math.max(...periodHighs);
    const lowest = Math.min(...periodLows);
    const rsv = highest === lowest ? 50 : ((closes[i] - lowest) / (highest - lowest)) * 100;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
  }

  return { k: Math.round(k * 100) / 100, d: Math.round(d * 100) / 100 };
}

function calcBollinger(closes: number[], period: number = 20, stdDev: number = 2) {
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, bandwidth: 0 };

  const middle = sma(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, v) => sum + (v - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);

  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;
  const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
  };
}

// ─── 主函數 ───

export function calculateIndicators(candles: OHLCV[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const last = closes.length - 1;

  const currentPrice = closes[last];
  const previousClose = closes[last - 1] || currentPrice;

  const r = (v: number) => Math.round(v * 100) / 100;

  // 報酬率
  const ret = (days: number) => {
    if (closes.length <= days) return 0;
    const old = closes[last - days];
    return old > 0 ? r(((currentPrice - old) / old) * 100) : 0;
  };

  // 20/60日高低
  const recentHighs = (n: number) => highs.length >= n ? Math.max(...highs.slice(-n)) : currentPrice;
  const recentLows = (n: number) => lows.length >= n ? Math.min(...lows.slice(-n)) : currentPrice;

  const sma20Val = sma(closes, 20);
  const sma60Val = sma(closes, 60);
  const volAvg20 = sma(volumes, 20);

  return {
    currentPrice: r(currentPrice),
    previousClose: r(previousClose),
    change: r(currentPrice - previousClose),
    changePercent: r(((currentPrice - previousClose) / previousClose) * 100),

    sma5: r(sma(closes, 5)),
    sma10: r(sma(closes, 10)),
    sma20: r(sma20Val),
    sma60: r(sma60Val),
    sma120: r(sma(closes, 120)),

    rsi14: r(calcRSI(closes, 14)),
    macd: calcMACD(closes),
    kd: calcKD(highs, lows, closes),
    bollinger: calcBollinger(closes),

    volumeAvg20: Math.round(volAvg20),
    volumeLatest: volumes[last],
    volumeRatio: volAvg20 > 0 ? r(volumes[last] / volAvg20) : 0,

    priceVsSma20: sma20Val > 0 ? r(((currentPrice - sma20Val) / sma20Val) * 100) : 0,
    priceVsSma60: sma60Val > 0 ? r(((currentPrice - sma60Val) / sma60Val) * 100) : 0,

    high20: r(recentHighs(20)),
    low20: r(recentLows(20)),
    high60: r(recentHighs(60)),
    low60: r(recentLows(60)),

    return5d: ret(5),
    return20d: ret(20),
    return60d: ret(60),

    recentCandles: candles.slice(-5).map((c, i, arr) => ({
      date: c.date,
      close: r(c.close),
      volume: c.volume,
      change: i > 0 ? r(c.close - arr[i - 1].close) : r(c.close - (candles[last - 5]?.close || c.close)),
    })),
  };
}
