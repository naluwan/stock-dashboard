import { Purchase, Sale, StockWithCalculations, IStock } from '@/types';

/**
 * 計算含手續費的加權平均成本
 * effectiveCost = (股價×股數 + 手續費) / 股數
 */
export function calculateAveragePrice(purchases: Purchase[]): number {
  if (!purchases || purchases.length === 0) return 0;
  const totalCost = purchases.reduce(
    (sum, p) => sum + p.shares * p.price + (p.commission || 0),
    0
  );
  const totalShares = purchases.reduce((sum, p) => sum + p.shares, 0);
  if (totalShares === 0) return 0;
  return totalCost / totalShares;
}

/** 持有股數 = 買入總股數 - 賣出總股數 */
export function calculateTotalShares(purchases: Purchase[], sales?: Sale[]): number {
  if (!purchases || purchases.length === 0) return 0;
  const bought = purchases.reduce((sum, p) => sum + p.shares, 0);
  const sold = sales ? sales.reduce((sum, s) => sum + s.shares, 0) : 0;
  return bought - sold;
}

export function calculateTotalCost(purchases: Purchase[]): number {
  if (!purchases || purchases.length === 0) return 0;
  return purchases.reduce((sum, p) => sum + p.shares * p.price + (p.commission || 0), 0);
}

/**
 * 計算已實現損益（含手續費+交易稅），可依年度篩選
 * P&L = (賣出價×股數 - 賣出手續費 - 交易稅) - (平均成本×股數)
 * 其中平均成本已含買入手續費
 */
export function calculateRealizedPL(sales: Sale[], year?: number): number {
  if (!sales || sales.length === 0) return 0;
  const filtered = year
    ? sales.filter(s => new Date(s.date).getFullYear() === year)
    : sales;
  return filtered.reduce((sum, s) => {
    const sellProceeds = s.price * s.shares - (s.commission || 0) - (s.tax || 0);
    const buyCost = s.avgCostAtSale * s.shares;
    return sum + (sellProceeds - buyCost);
  }, 0);
}

export function enrichStockWithCalculations(stock: IStock, currentPrice?: number): StockWithCalculations {
  const averagePrice = calculateAveragePrice(stock.purchases);
  const totalShares = calculateTotalShares(stock.purchases, stock.sales);
  const totalCost = averagePrice * totalShares; // 持有部位的成本 = 均價 × 持有股數

  const result: StockWithCalculations = {
    ...stock,
    averagePrice,
    totalShares,
    totalCost,
    realizedPL: calculateRealizedPL(stock.sales || []),
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
