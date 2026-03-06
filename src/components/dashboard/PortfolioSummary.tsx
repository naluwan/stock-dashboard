'use client';

import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatNumber, formatPercent } from '@/lib/utils';

interface PortfolioSummaryProps {
  stocks: StockWithCalculations[];
}

export default function PortfolioSummary({ stocks }: PortfolioSummaryProps) {
  const totalCost = stocks.reduce((sum, s) => sum + s.totalCost, 0);
  const totalValue = stocks.reduce((sum, s) => sum + (s.totalValue || 0), 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const stockCount = stocks.length;

  const cards = [
    {
      title: '總投入成本',
      value: `NT$ ${formatNumber(totalCost, 0)}`,
      icon: DollarSign,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: '目前市值',
      value: `NT$ ${formatNumber(totalValue, 0)}`,
      icon: BarChart3,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50 dark:bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: '未實現損益',
      value: `NT$ ${formatNumber(totalProfit, 0)}`,
      subtitle: formatPercent(totalProfitPercent),
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: totalProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500',
      lightColor: totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10',
      textColor: totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
    },
    {
      title: '持股數量',
      value: `${stockCount} 檔`,
      icon: BarChart3,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50 dark:bg-amber-500/10',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                <p className={`mt-1 text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                {card.subtitle && (
                  <p className={`text-sm font-medium ${card.textColor}`}>{card.subtitle}</p>
                )}
              </div>
              <div className={`rounded-xl p-3 ${card.lightColor}`}>
                <Icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
