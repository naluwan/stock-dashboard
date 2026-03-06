'use client';

import { Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

interface StockTableProps {
  stocks: StockWithCalculations[];
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
}

export default function StockTable({ stocks, onEdit, onDelete }: StockTableProps) {
  if (stocks.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <p className="text-gray-400 text-lg">尚未新增任何持股</p>
        <p className="text-gray-400 text-sm mt-1">點擊「新增持股」開始記錄你的投資組合</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">股票</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">目前價格</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">平均成本</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">股數</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">投入成本</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">目前市值</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">損益</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const isProfit = (stock.totalProfit || 0) >= 0;
            return (
              <tr key={stock._id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      stock.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                    }`}>
                      {stock.market}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{stock.symbol}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stock.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(stock.averagePrice, stock.market)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {formatNumber(stock.totalShares, 0)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {formatCurrency(stock.totalCost, stock.market)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {stock.totalValue !== undefined ? formatCurrency(stock.totalValue, stock.market) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`flex items-center justify-end gap-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isProfit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span className="font-medium">
                      {stock.totalProfit !== undefined ? formatCurrency(stock.totalProfit, stock.market) : '-'}
                    </span>
                    <span className="text-xs">
                      ({formatPercent(stock.totalProfitPercent || 0)})
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(stock)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => stock._id && onDelete(stock._id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
