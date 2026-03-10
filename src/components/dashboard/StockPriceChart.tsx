'use client';

import { useState, useEffect } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  ComposedChart,
  Cell,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { Market } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface HistoryDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockPriceChartProps {
  symbol: string;
  market: Market;
  currentPrice?: number;
}

type ChartMode = 'line' | 'candlestick';

interface TimeOption {
  key: string;
  label: string;
  days: number;
  intraday: boolean;
}

const TIME_OPTIONS: TimeOption[] = [
  { key: '1d', label: '1日', days: 1, intraday: true },
  { key: '1w', label: '1週', days: 5, intraday: false },
  { key: '15d', label: '15日', days: 15, intraday: false },
  { key: '1m', label: '月', days: 30, intraday: false },
  { key: '1y', label: '年', days: 365, intraday: false },
];

// 格式化成交量（萬/億）
function formatVolume(v: number): string {
  if (v >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}億`;
  if (v >= 1_0000) return `${(v / 1_0000).toFixed(0)}萬`;
  return formatNumber(v, 0);
}

// 自訂 Tooltip 內容
function CustomTooltip({
  active,
  payload,
  label,
  market,
  timeLabel,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, number | boolean | string> }>;
  label?: string;
  market: Market;
  timeLabel: string;
  mode: ChartMode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg">
      <p className="mb-1 text-gray-400">
        {timeLabel}: {label}
      </p>
      {mode === 'candlestick' ? (
        <>
          <p>開盤: {formatCurrency(d.open as number, market)}</p>
          <p>最高: {formatCurrency(d.high as number, market)}</p>
          <p>最低: {formatCurrency(d.low as number, market)}</p>
          <p>收盤: {formatCurrency(d.close as number, market)}</p>
        </>
      ) : (
        <p>收盤: {formatCurrency(d.close as number, market)}</p>
      )}
      <p className="mt-1 border-t border-gray-600 pt-1 text-gray-300">
        成交量: {formatVolume(d.volume as number)}
      </p>
    </div>
  );
}

export default function StockPriceChart({ symbol, market, currentPrice }: StockPriceChartProps) {
  const [data, setData] = useState<HistoryDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [mode, setMode] = useState<ChartMode>('line');
  const [selectedTime, setSelectedTime] = useState<string>('1d');

  const currentTimeOption = TIME_OPTIONS.find((t) => t.key === selectedTime) || TIME_OPTIONS[0];

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setIsFallback(false);
      try {
        const params = new URLSearchParams({
          symbol,
          market,
          days: String(currentTimeOption.days),
        });
        if (currentTimeOption.intraday) {
          params.set('intraday', 'true');
        }
        const res = await fetch(`/api/history?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data || []);
          setIsFallback(json.fallback || false);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [symbol, market, selectedTime, currentTimeOption.days, currentTimeOption.intraday]);

  // 時間範圍切換按鈕
  const TimeSelector = () => (
    <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
      {TIME_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setSelectedTime(opt.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            selectedTime === opt.key
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white">價格走勢</h3>
          <TimeSelector />
        </div>
        <div className="flex items-center justify-center h-64 text-gray-400">
          {currentTimeOption.intraday ? '目前無當日分時資料（可能非交易時間）' : '暫無歷史資料'}
        </div>
      </div>
    );
  }

  const minPrice = Math.min(...data.map((d) => d.low)) * 0.998;
  const maxPrice = Math.max(...data.map((d) => d.high)) * 1.002;
  const avgPrice = data.reduce((sum, d) => sum + d.close, 0) / data.length;
  const maxVolume = Math.max(...data.map((d) => d.volume));

  // K 線圖需要的資料
  const chartData = data.map((d) => ({
    ...d,
    isUp: d.close >= d.open,
    bodyLow: Math.min(d.open, d.close),
    bodyHigh: Math.max(d.open, d.close),
    bodyHeight: Math.abs(d.close - d.open) || 0.01, // 避免零高度
  }));

  const isIntraday = currentTimeOption.intraday && !isFallback;
  const timeLabel = isIntraday ? '時間' : '日期';

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 dark:text-white">價格走勢</h3>
          {isIntraday && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {market === 'US' ? '(美東時間)' : '(台灣時間)'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TimeSelector />
          {/* 圖表模式切換 */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            <button
              onClick={() => setMode('line')}
              className={`rounded-md p-1.5 transition-colors ${
                mode === 'line'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-600 dark:text-emerald-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="走勢圖"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMode('candlestick')}
              className={`rounded-md p-1.5 transition-colors ${
                mode === 'candlestick'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-600 dark:text-emerald-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="K 線圖"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isFallback && (
        <p className="mb-3 text-center text-xs text-amber-500 dark:text-amber-400">
          非交易時間，顯示最近交易日資料
        </p>
      )}

      {/* 合併圖表：價格 + 成交量 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 6))}
            />
            {/* 左側 Y 軸：價格 */}
            <YAxis
              yAxisId="price"
              domain={[minPrice, maxPrice]}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toFixed(0)}
              width={60}
            />
            {/* 右側 Y 軸：成交量（隱藏刻度，只用來定位） */}
            <YAxis
              yAxisId="volume"
              orientation="right"
              domain={[0, maxVolume * 5]}
              tick={false}
              tickLine={false}
              axisLine={false}
              width={0}
            />
            <Tooltip
              content={
                <CustomTooltip market={market} timeLabel={timeLabel} mode={mode} />
              }
            />

            {/* 成交量柱狀圖（底部，半透明） */}
            <Bar yAxisId="volume" dataKey="volume" barSize={data.length > 60 ? 2 : data.length > 20 ? 4 : 6} opacity={0.4}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`vol-${index}`}
                  fill={entry.isUp ? '#ef4444' : '#22c55e'}
                />
              ))}
            </Bar>

            {mode === 'candlestick' ? (
              <>
                {/* K 線上影線（high）和下影線（low）— 用細 Bar 模擬 */}
                <Bar yAxisId="price" dataKey="high" fill="transparent" barSize={1}>
                  {chartData.map((entry, index) => (
                    <Cell key={`wick-h-${index}`} fill={entry.isUp ? '#ef4444' : '#22c55e'} />
                  ))}
                </Bar>
                <Bar yAxisId="price" dataKey="low" fill="transparent" barSize={1}>
                  {chartData.map((entry, index) => (
                    <Cell key={`wick-l-${index}`} fill={entry.isUp ? '#ef4444' : '#22c55e'} />
                  ))}
                </Bar>
                {/* K 線柱體 */}
                <Bar yAxisId="price" dataKey="bodyHeight" stackId="candle" barSize={data.length > 60 ? 3 : data.length > 20 ? 5 : 8}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`body-${index}`}
                      fill={entry.isUp ? '#ef4444' : '#22c55e'}
                    />
                  ))}
                </Bar>
                {/* 收盤線（淡灰色虛線） */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </>
            ) : (
              <>
                {/* 收盤價走勢線 */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
                {/* 均線 */}
                <ReferenceLine
                  yAxisId="price"
                  y={avgPrice}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{ value: '均線', position: 'right', fill: '#6366f1', fontSize: 10 }}
                />
              </>
            )}

            {/* 現價參考線 */}
            {currentPrice && (
              <ReferenceLine
                yAxisId="price"
                y={currentPrice}
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 圖例 */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
        {mode === 'line' ? (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-emerald-500" /> 收盤價
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-indigo-500" style={{ borderTop: '1px dashed' }} /> 均線
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-2 rounded-sm bg-red-500" /> 上漲
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-2 rounded-sm bg-green-500" /> 下跌
            </span>
          </>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-2 rounded-sm bg-gray-400 opacity-40" /> 成交量
        </span>
      </div>
    </div>
  );
}
