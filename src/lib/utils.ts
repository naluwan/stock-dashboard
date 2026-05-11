import { Purchase, Sale, StockWithCalculations, IStock, ITradingConfig, Market } from '@/types';

export const DEFAULT_TRADING_CONFIG: ITradingConfig = {
  twStockFeeRate: 0.1425,
  twStockMinFee: 20,
  usStockFeeRate: 0,
};

/** 證交稅率（政府固定）：台股個股 0.3%、ETF 0.1%、美股 0% */
function getStockTaxRate(symbol: string, market: Market): number {
  if (market === 'US') return 0;
  return symbol.startsWith('00') ? 0.001 : 0.003;
}

/**
 * 計算「假設現在賣出」要付的手續費 + 證交稅。
 * 用於把市值預扣成「實際能拿到的金額」，跟券商「預估損益」對齊。
 */
export function calculateSellingCost(
  marketValue: number,
  symbol: string,
  market: Market,
  config: ITradingConfig = DEFAULT_TRADING_CONFIG,
): number {
  if (marketValue <= 0) return 0;
  const taxRate = getStockTaxRate(symbol, market);
  const feeRatePct = market === 'TW' ? config.twStockFeeRate : config.usStockFeeRate;
  const minFee = market === 'TW' ? config.twStockMinFee : 0;

  const fee = Math.max(marketValue * (feeRatePct / 100), minFee);
  const tax = marketValue * taxRate;
  return fee + tax;
}

interface FIFOState {
  averagePrice: number;
  totalShares: number;
  totalCost: number;
  realizedPL: number;
  saleAvgCosts: number[]; // 對應 stock.sales[i] 的「該筆賣出實際扣除單位成本」
}

/**
 * FIFO（先進先出 / 個別批次成本法）：
 * - 買入批次依日期排序進入佇列
 * - 賣出時從最早批次開始消耗，跨多批次可分攤
 * - 平均成本 = 剩餘批次（股數 × 含手續費分攤的單位成本）/ 剩餘股數
 * - 已實現損益 = 賣出回收 − 該筆消耗到的批次成本
 * 這與多數台灣券商（含對帳單）的算法一致。
 */
function computeFIFO(stock: { purchases: Purchase[]; sales?: Sale[] }): FIFOState {
  const purchases = stock.purchases || [];
  const sales = stock.sales || [];

  // 買入批次按時間排序，記下原 idx 以便手續費分攤
  const lots = purchases
    .map((p, idx) => ({
      origIdx: idx,
      time: new Date(p.date).getTime(),
      remaining: p.shares,
      origShares: p.shares,
      price: p.price,
      commission: p.commission || 0,
    }))
    .sort((a, b) => a.time - b.time || a.origIdx - b.origIdx);

  // 賣出按時間排序，保留原 idx 以寫回 saleAvgCosts
  const sortedSales = sales
    .map((s, idx) => ({
      origIdx: idx,
      time: new Date(s.date).getTime(),
      shares: s.shares,
      price: s.price,
      commission: s.commission || 0,
      tax: s.tax || 0,
    }))
    .sort((a, b) => a.time - b.time || a.origIdx - b.origIdx);

  let realizedPL = 0;
  const saleAvgCosts = new Array<number>(sales.length).fill(0);

  for (const sale of sortedSales) {
    let toSell = sale.shares;
    let saleCostBasis = 0;

    for (const lot of lots) {
      if (toSell <= 0) break;
      if (lot.remaining <= 0) continue;
      const take = Math.min(lot.remaining, toSell);
      const unitCost = lot.price + (lot.origShares > 0 ? lot.commission / lot.origShares : 0);
      saleCostBasis += take * unitCost;
      lot.remaining -= take;
      toSell -= take;
    }

    const proceeds = sale.price * sale.shares - sale.commission - sale.tax;
    realizedPL += proceeds - saleCostBasis;
    saleAvgCosts[sale.origIdx] = sale.shares > 0 ? saleCostBasis / sale.shares : 0;
  }

  let totalShares = 0;
  let totalCost = 0;
  for (const lot of lots) {
    if (lot.remaining <= 0) continue;
    totalShares += lot.remaining;
    const unitCost = lot.price + (lot.origShares > 0 ? lot.commission / lot.origShares : 0);
    totalCost += lot.remaining * unitCost;
  }

  return {
    averagePrice: totalShares > 0 ? totalCost / totalShares : 0,
    totalShares,
    totalCost,
    realizedPL,
    saleAvgCosts,
  };
}

/** 目前持股的單位成本（含手續費分攤、依 FIFO 計算）。 */
export function calculateAveragePrice(stock: { purchases: Purchase[]; sales?: Sale[] }): number {
  return computeFIFO(stock).averagePrice;
}

/** 持有股數 = 買入總股數 − 賣出總股數 */
export function calculateTotalShares(purchases: Purchase[], sales?: Sale[]): number {
  if (!purchases || purchases.length === 0) return 0;
  const bought = purchases.reduce((sum, p) => sum + p.shares, 0);
  const sold = sales ? sales.reduce((sum, s) => sum + s.shares, 0) : 0;
  return bought - sold;
}

/** 目前持有部位的剩餘成本（FIFO 加總） */
export function calculateTotalCost(stock: { purchases: Purchase[]; sales?: Sale[] }): number {
  return computeFIFO(stock).totalCost;
}

/**
 * 已實現損益（FIFO 個別批次成本法）。
 * - 不分年度：直接回傳累計
 * - 指定年度：用該年內每筆賣出對應的 saleAvgCost 重算
 */
export function calculateRealizedPL(
  stock: { purchases: Purchase[]; sales?: Sale[] },
  year?: number,
): number {
  const state = computeFIFO(stock);
  const sales = stock.sales || [];
  if (!year) return state.realizedPL;
  return sales.reduce((sum, s, i) => {
    if (new Date(s.date).getFullYear() !== year) return sum;
    const avgAtSale = state.saleAvgCosts[i] ?? 0;
    const proceeds = s.price * s.shares - (s.commission || 0) - (s.tax || 0);
    return sum + (proceeds - avgAtSale * s.shares);
  }, 0);
}

export function enrichStockWithCalculations(
  stock: IStock,
  currentPrice?: number,
  tradingConfig: ITradingConfig = DEFAULT_TRADING_CONFIG,
): StockWithCalculations {
  const state = computeFIFO(stock);
  const averagePrice = state.averagePrice;
  const totalShares = state.totalShares;
  const totalCost = state.totalCost;

  // 覆寫 sales 的 avgCostAtSale 為 FIFO 動態值（給 UI 用，不寫回 DB）
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
    const grossValue = currentPrice * totalShares;
    const sellingCost = calculateSellingCost(grossValue, stock.symbol, stock.market, tradingConfig);
    const netValue = grossValue - sellingCost;

    result.currentPrice = currentPrice;
    result.priceChange = currentPrice - averagePrice;
    result.priceChangePercent = averagePrice > 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0;
    result.totalValue = netValue;
    result.totalProfit = netValue - totalCost;
    result.totalProfitPercent = totalCost > 0 ? ((netValue - totalCost) / totalCost) * 100 : 0;
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
