import { Purchase, Sale, StockWithCalculations, IStock } from '@/types';

interface MovingAverageState {
  averagePrice: number;
  totalShares: number;
  realizedPL: number;
  saleAvgCosts: number[]; // 對應 stock.sales[i] 的動態移動均價快照
}

/**
 * 按時間順序處理買入 + 賣出，計算「移動加權平均成本」。
 * - 買入時：剩餘成本 += 新買金額 + 手續費；股數累加；均價 = 剩餘成本 / 剩餘股數
 * - 賣出時：先用「當下均價」記錄這筆賣出的成本基礎；然後扣掉對應成本與股數；均價不變
 * 這與券商 App 顯示的均價邏輯一致。
 */
function computeMovingAverage(stock: { purchases: Purchase[]; sales?: Sale[] }): MovingAverageState {
  const purchases = stock.purchases || [];
  const sales = stock.sales || [];

  type Event =
    | { kind: 'buy'; time: number; order: number; idx: number; shares: number; price: number; commission: number }
    | { kind: 'sell'; time: number; order: number; idx: number; shares: number; price: number; commission: number; tax: number };

  const events: Event[] = [];
  purchases.forEach((p, idx) => {
    events.push({
      kind: 'buy',
      time: new Date(p.date).getTime(),
      order: 0,
      idx,
      shares: p.shares,
      price: p.price,
      commission: p.commission || 0,
    });
  });
  sales.forEach((s, idx) => {
    events.push({
      kind: 'sell',
      time: new Date(s.date).getTime(),
      order: 1, // 同一天時，買入先於賣出處理
      idx,
      shares: s.shares,
      price: s.price,
      commission: s.commission || 0,
      tax: s.tax || 0,
    });
  });

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.order !== b.order) return a.order - b.order;
    return a.idx - b.idx;
  });

  let shares = 0;
  let costBasis = 0;
  let realizedPL = 0;
  const saleAvgCosts = new Array<number>(sales.length).fill(0);

  for (const ev of events) {
    if (ev.kind === 'buy') {
      costBasis += ev.shares * ev.price + ev.commission;
      shares += ev.shares;
    } else {
      const avgAtSale = shares > 0 ? costBasis / shares : 0;
      saleAvgCosts[ev.idx] = avgAtSale;

      const proceeds = ev.price * ev.shares - ev.commission - ev.tax;
      realizedPL += proceeds - avgAtSale * ev.shares;

      costBasis -= avgAtSale * ev.shares;
      shares -= ev.shares;
      if (shares <= 0) {
        shares = 0;
        costBasis = 0;
      }
    }
  }

  return {
    averagePrice: shares > 0 ? costBasis / shares : 0,
    totalShares: shares,
    realizedPL,
    saleAvgCosts,
  };
}

/**
 * 計算目前持股的「移動加權平均成本」（含買入手續費）。
 * 必須傳入完整 stock（包含 sales），才能正確反映賣出對均價的影響。
 */
export function calculateAveragePrice(stock: { purchases: Purchase[]; sales?: Sale[] }): number {
  return computeMovingAverage(stock).averagePrice;
}

/** 持有股數 = 買入總股數 - 賣出總股數 */
export function calculateTotalShares(purchases: Purchase[], sales?: Sale[]): number {
  if (!purchases || purchases.length === 0) return 0;
  const bought = purchases.reduce((sum, p) => sum + p.shares, 0);
  const sold = sales ? sales.reduce((sum, s) => sum + s.shares, 0) : 0;
  return bought - sold;
}

/** 目前持有部位的成本（= 移動均價 × 持有股數） */
export function calculateTotalCost(stock: { purchases: Purchase[]; sales?: Sale[] }): number {
  const state = computeMovingAverage(stock);
  return state.averagePrice * state.totalShares;
}

/**
 * 已實現損益（移動加權）：依時間順序逐筆賣出累加。
 * - 不分年度時：直接回傳 computeMovingAverage 的 realizedPL（總和）
 * - 指定年度時：對該年內的賣出按「該筆賣出當下動態均價」計算
 */
export function calculateRealizedPL(stock: { purchases: Purchase[]; sales?: Sale[] }, year?: number): number {
  const state = computeMovingAverage(stock);
  const sales = stock.sales || [];
  if (!year) return state.realizedPL;
  return sales.reduce((sum, s, i) => {
    if (new Date(s.date).getFullYear() !== year) return sum;
    const avgAtSale = state.saleAvgCosts[i] ?? 0;
    const proceeds = s.price * s.shares - (s.commission || 0) - (s.tax || 0);
    return sum + (proceeds - avgAtSale * s.shares);
  }, 0);
}

export function enrichStockWithCalculations(stock: IStock, currentPrice?: number): StockWithCalculations {
  const state = computeMovingAverage(stock);
  const averagePrice = state.averagePrice;
  const totalShares = state.totalShares;
  const totalCost = averagePrice * totalShares;

  // 覆寫 sales 的 avgCostAtSale 為動態移動均價（給 UI 元件使用，不寫回 DB）
  const sales = (stock.sales || []).map((s, i) => ({
    ...s,
    avgCostAtSale: state.saleAvgCosts[i] ?? s.avgCostAtSale,
  }));

  const result: StockWithCalculations = {
    ...stock,
    sales,
    averagePrice,
    totalShares,
    totalCost,
    realizedPL: state.realizedPL,
  };

  if (currentPrice !== undefined) {
    result.currentPrice = currentPrice;
    result.priceChange = currentPrice - averagePrice;
    result.priceChangePercent = averagePrice > 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0;
    result.totalValue = currentPrice * totalShares;
    result.totalProfit = result.totalValue - totalCost;
    result.totalProfitPercent = totalCost > 0 ? ((result.totalValue - totalCost) / totalCost) * 100 : 0;
  }

  return result;
}

export function formatCurrency(value: number, market: 'TW' | 'US'): string {
  if (market === 'TW') {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

/**
 * 用於金額類數字（總金額、損益、市值等），不是單位價格。
 * 台股顯示為整數（無小數），美股保留 2 位小數。
 */
export function formatAmount(value: number, market: 'TW' | 'US'): string {
  if (market === 'TW') {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatShares(value: number, market: 'TW' | 'US'): string {
  return formatNumber(value, market === 'US' ? 5 : 0);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
