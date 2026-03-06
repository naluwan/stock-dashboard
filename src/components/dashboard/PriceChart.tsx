'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StockWithCalculations } from '@/types';
import { formatNumber } from '@/lib/utils';

interface PriceChartProps {
  stocks: StockWithCalculations[];
}

const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

export default function PriceChart({ stocks }: PriceChartProps) {
  if (stocks.length === 0) return null;

  const data = stocks.map((stock, index) => ({
    name: stock.symbol,
    fullName: `${stock.symbol} ${stock.name}`,
    value: stock.totalValue || stock.totalCost,
    color: COLORS[index % COLORS.length],
  }));

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200 sm:p-5 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">持股比例</h3>

      {/* 圖表 */}
      <div className="h-48 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => {
                const v = value ?? 0;
                return [
                  `${formatNumber(v, 0)} (${((v / totalValue) * 100).toFixed(1)}%)`,
                  '市值',
                ];
              }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 自訂圖例（避免 Recharts Legend 導致空間不夠被切） */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">{entry.fullName}</span>
            <span className="text-xs text-gray-400">
              {((entry.value / totalValue) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
