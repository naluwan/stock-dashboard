'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
    name: `${stock.symbol} ${stock.name}`,
    value: stock.totalValue || stock.totalCost,
    color: COLORS[index % COLORS.length],
  }));

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">持股比例</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
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
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
