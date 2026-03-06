'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

interface StockCardProps {
  stock: StockWithCalculations;
}

export default function StockCard({ stock }: StockCardProps) {
  const isProfit = (stock.totalProfit || 0) >= 0;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              stock.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
            }`}>
              {stock.market === 'TW' ? '台股' : '美股'}
            </span>
            <h3 className="font-bold text-gray-900 dark:text-white">{stock.symbol}</h3>
          </div>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
        </div>
        <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium ${
          isProfit ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {formatPercent(stock.totalProfitPercent || 0)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">目前價格</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">平均成本</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(stock.averagePrice, stock.market)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">持有股數</p>
          <p className="font-semibold text-gray-900 dark:text-white">{formatNumber(stock.totalShares, 0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">未實現損益</p>
          <p className={`font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {stock.totalProfit !== undefined ? formatCurrency(stock.totalProfit, stock.market) : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
