'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatNumber, formatAmount, calculateRealizedPL } from '@/lib/utils';

interface YearlyPLReportProps {
  stocks: StockWithCalculations[];
  usdRate?: number;
  privacyMode?: boolean;
}

const MASK = '****';

export default function YearlyPLReport({ stocks, usdRate = 0, privacyMode = false }: YearlyPLReportProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const toTWD = (amount: number, market: string) =>
    market === 'US' && usdRate > 0 ? amount * usdRate : amount;

  // 該年度已實現損益（按每檔股票）
  const yearlyStockPL = stocks
    .map(s => {
      const sales = (s.sales || []).filter(
        sale => new Date(sale.date).getFullYear() === selectedYear
      );
      if (sales.length === 0) return null;
      const pl = sales.reduce((sum, sale) => sum + (sale.price - sale.avgCostAtSale) * sale.shares, 0);
      const totalShares = sales.reduce((sum, sale) => sum + sale.shares, 0);
      return {
        symbol: s.symbol,
        name: s.name,
        market: s.market,
        salesCount: sales.length,
        totalSharesSold: totalShares,
        realizedPL: pl,
        realizedPLTWD: toTWD(pl, s.market),
      };
    })
    .filter(Boolean) as {
      symbol: string;
      name: string;
      market: string;
      salesCount: number;
      totalSharesSold: number;
      realizedPL: number;
      realizedPLTWD: number;
    }[];

  // 年度合計
  const yearlyTotalPL = yearlyStockPL.reduce((sum, s) => sum + s.realizedPLTWD, 0);

  // 未實現損益（目前持股）
  const unrealizedPL = stocks.reduce((sum, s) => {
    if (s.totalProfit === undefined) return sum;
    return sum + toTWD(s.totalProfit, s.market);
  }, 0);

  // 所有有賣出紀錄的年份
  const allYears = new Set<number>();
  stocks.forEach(s => {
    (s.sales || []).forEach(sale => {
      allYears.add(new Date(sale.date).getFullYear());
    });
  });
  allYears.add(currentYear);
  const sortedYears = Array.from(allYears).sort((a, b) => b - a);

  const minYear = sortedYears[sortedYears.length - 1];
  const maxYear = sortedYears[0];

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      {/* 標題 + 年份選擇 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">年度損益報表</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(y => Math.max(y - 1, minYear))}
            disabled={selectedYear <= minYear}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear(y => Math.min(y + 1, maxYear))}
            disabled={selectedYear >= maxYear}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 摘要 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedYear} 年已實現損益
            </p>
            <p className={`text-lg font-bold ${yearlyTotalPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {privacyMode ? MASK : `NT$ ${formatNumber(yearlyTotalPL, 0)}`}
            </p>
          </div>
          {selectedYear === currentYear && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">目前未實現損益</p>
              <p className={`text-lg font-bold ${unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {privacyMode ? MASK : `NT$ ${formatNumber(unrealizedPL, 0)}`}
              </p>
            </div>
          )}
        </div>

        {/* 各股票明細 */}
        {yearlyStockPL.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">已實現明細</p>
            {yearlyStockPL.map(s => (
              <div
                key={`${s.market}_${s.symbol}`}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    s.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                  }`}>{s.market}</span>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{s.symbol}</span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{s.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  {privacyMode ? (
                    <span className="text-sm text-gray-400">{MASK}</span>
                  ) : (
                    <>
                      <div className={`flex items-center gap-1 text-sm font-medium ${s.realizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {s.realizedPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatAmount(s.realizedPL, s.market as 'TW' | 'US')}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {s.salesCount} 筆 / {s.totalSharesSold} 股
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">
            {selectedYear} 年尚無賣出紀錄
          </p>
        )}
      </div>
    </div>
  );
}
