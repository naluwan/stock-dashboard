'use client';

import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations, Sale } from '@/types';
import { formatCurrency, formatAmount, formatNumber, formatShares } from '@/lib/utils';

interface SellHistoryListProps {
  stock: StockWithCalculations;
  onDelete: (saleId: string) => void;
}

export default function SellHistoryList({ stock, onDelete }: SellHistoryListProps) {
  const sales = stock.sales || [];
  const isUS = stock.market === 'US';

  if (sales.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-700/50">
        <p className="text-sm text-gray-400">此股票尚無賣出紀錄</p>
      </div>
    );
  }

  // 按日期降序（最新的在前）
  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalRealizedPL = sales.reduce(
    (sum, s) => sum + (s.price * s.shares - (s.commission || 0) - (s.tax || 0) - s.avgCostAtSale * s.shares),
    0
  );

  const formatDate = (d: Date | string) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-3">
      {/* 股票資訊 */}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            stock.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
          }`}>{stock.market}</span>
          <span className="font-bold text-gray-900 dark:text-white">{stock.symbol}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">共 {sales.length} 筆賣出</span>
          <span className={`font-semibold ${totalRealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            累計已實現損益 {formatAmount(totalRealizedPL, stock.market)}
          </span>
        </div>
      </div>

      {/* 賣出明細 */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {sortedSales.map((sale: Sale) => {
          const sellProceeds = sale.price * sale.shares - (sale.commission || 0) - (sale.tax || 0);
          const buyCost = sale.avgCostAtSale * sale.shares;
          const pl = sellProceeds - buyCost;
          const plPercent = buyCost > 0 ? (pl / buyCost) * 100 : 0;
          const amount = sale.price * sale.shares;
          const fees = (sale.commission || 0) + (sale.tax || 0);

          return (
            <div
              key={sale._id}
              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              {/* 頂部：日期和刪除 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {formatDate(sale.date)}
                </span>
                <button
                  onClick={() => sale._id && onDelete(sale._id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                  title="刪除此筆賣出紀錄"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 交易資訊 */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-gray-400">股數</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatShares(sale.shares, stock.market)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">賣出價</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(sale.price, stock.market)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">當下成本</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(sale.avgCostAtSale, stock.market)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">總金額</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatAmount(amount, stock.market)}
                  </p>
                </div>
              </div>

              {/* 手續費/交易稅 */}
              {fees > 0 && (
                <div className="mt-1.5 flex gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                  {(sale.commission || 0) > 0 && <span>手續費 {formatNumber(sale.commission || 0, 0)}</span>}
                  {(sale.tax || 0) > 0 && <span>交易稅 {formatNumber(sale.tax || 0, 0)}</span>}
                  <span>實收 {formatAmount(sellProceeds, stock.market)}</span>
                </div>
              )}

              {/* 損益 */}
              <div className={`mt-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
                pl >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {pl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>已實現 {formatAmount(pl, stock.market)}</span>
                <span className="text-[10px]">({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)</span>
                {isUS && sale.exchangeRate && (
                  <span className="ml-auto text-[10px] text-gray-400">
                    匯率 {formatNumber(sale.exchangeRate, 2)}
                  </span>
                )}
              </div>

              {/* 備註 */}
              {sale.note && (
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  備註：{sale.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
