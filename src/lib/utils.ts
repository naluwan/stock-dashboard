import { Purchase, StockWithCalculations, IStock } from '@/types';

export function calculateAveragePrice(purchases: Purchase[]): number {
  if (!purchases || purchases.length === 0) return 0;
  const totalCost = purchases.reduce((sum, p) => sum + p.shares * p.price, 0);
  const totalShares = purchases.reduce((sum, p) => sum + p.shares, 0);
  if (totalShares === 0) return 0;
  return totalCost / totalShares;
}

export function calculateTotalShares(purchases: Purchase[]): number {
  if (!purchases || purchases.length === 0) return 0;
  return purchases.reduce((sum, p) => sum + p.shares, 0);
}

export function calculateTotalCost(purchases: Purchase[]): number {
  if (!purchases || purchases.length === 0) return 0;
  return purchases.reduce((sum, p) => sum + p.shares * p.price, 0);
}

export function enrichStockWithCalculations(stock: IStock, currentPrice?: number): StockWithCalculations {
  const averagePrice = calculateAveragePrice(stock.purchases);
  const totalShares = calculateTotalShares(stock.purchases);
  const totalCost = calculateTotalCost(stock.purchases);

  const result: StockWithCalculations = {
    ...stock,
    averagePrice,
    totalShares,
    totalCost,
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

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
