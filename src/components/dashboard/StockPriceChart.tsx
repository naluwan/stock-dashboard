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
import { Card, Center, Group, Loader, SegmentedControl, Stack, Text } from '@mantine/core';
import { TrendingUp, BarChart3 } from 'lucide-react';
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

function formatVolume(v: number): string {
  if (v >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}億`;
  if (v >= 1_0000) return `${(v / 1_0000).toFixed(0)}萬`;
  return formatNumber(v, 0);
}

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
    <Card withBorder shadow="md" radius="md" p="xs" bg="var(--mantine-color-body)">
      <Text size="xs" c="dimmed" mb={4}>{timeLabel}: {label}</Text>
      {mode === 'candlestick' ? (
        <>
          <Text size="xs">開盤: {formatCurrency(d.open as number, market)}</Text>
          <Text size="xs">最高: {formatCurrency(d.high as number, market)}</Text>
          <Text size="xs">最低: {formatCurrency(d.low as number, market)}</Text>
          <Text size="xs">收盤: {formatCurrency(d.close as number, market)}</Text>
        </>
      ) : (
        <Text size="xs">收盤: {formatCurrency(d.close as number, market)}</Text>
      )}
      <Text
        size="xs"
        c="dimmed"
        mt={4}
        pt={4}
        style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      >
        成交量: {formatVolume(d.volume as number)}
      </Text>
    </Card>
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

  const timeSelector = (
    <SegmentedControl
      size="xs"
      value={selectedTime}
      onChange={setSelectedTime}
      data={TIME_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
    />
  );

  const modeSelector = (
    <SegmentedControl
      size="xs"
      value={mode}
      onChange={(v) => setMode(v as ChartMode)}
      data={[
        { value: 'line', label: <TrendingUp size={14} /> },
        { value: 'candlestick', label: <BarChart3 size={14} /> },
      ]}
    />
  );

  if (isLoading) {
    return (
      <Card withBorder radius="lg" p="md">
        <Center h={260}>
          <Loader color="teal" size="sm" />
        </Center>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card withBorder radius="lg" p="md">
        <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
          <Text fw={500}>價格走勢</Text>
          {timeSelector}
        </Group>
        <Center h={260}>
          <Text c="dimmed" size="sm">
            {currentTimeOption.intraday ? '目前無當日分時資料（可能非交易時間）' : '暫無歷史資料'}
          </Text>
        </Center>
      </Card>
    );
  }

  const rawMin = Math.min(...data.map((d) => d.low));
  const rawMax = Math.max(...data.map((d) => d.high));
  const minPrice = rawMin * 0.998;
  const maxPrice = rawMax * 1.002;
  const priceRange = rawMax - rawMin;
  const yDecimals = priceRange < 1 ? 2 : priceRange < 10 ? 1 : 0;
  const avgPrice = data.reduce((sum, d) => sum + d.close, 0) / data.length;
  const maxVolume = Math.max(...data.map((d) => d.volume));

  const chartData = data.map((d) => ({
    ...d,
    isUp: d.close >= d.open,
    bodyLow: Math.min(d.open, d.close),
    bodyHigh: Math.max(d.open, d.close),
    bodyHeight: Math.abs(d.close - d.open) || 0.01,
  }));

  const isIntraday = currentTimeOption.intraday && !isFallback;
  const timeLabel = isIntraday ? '時間' : '日期';

  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Text fw={500}>價格走勢</Text>
            {isIntraday && (
              <Text size="10px" c="dimmed">
                {market === 'US' ? '(美東時間)' : '(台灣時間)'}
              </Text>
            )}
          </Group>
          <Group gap="xs" wrap="wrap">
            {timeSelector}
            {modeSelector}
          </Group>
        </Group>

        {isFallback && (
          <Text ta="center" size="xs" c="yellow">
            非交易時間，顯示最近交易日資料
          </Text>
        )}

        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--mantine-color-dimmed)' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(data.length / 6))}
              />
              <YAxis
                yAxisId="price"
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 10, fill: 'var(--mantine-color-dimmed)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toFixed(yDecimals)}
                width={60}
              />
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
                content={<CustomTooltip market={market} timeLabel={timeLabel} mode={mode} />}
              />

              <Bar
                yAxisId="volume"
                dataKey="volume"
                barSize={data.length > 60 ? 2 : data.length > 20 ? 4 : 6}
                opacity={0.4}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`vol-${index}`}
                    fill={entry.isUp ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)'}
                  />
                ))}
              </Bar>

              {mode === 'candlestick' ? (
                <>
                  <Bar yAxisId="price" dataKey="high" fill="transparent" barSize={1}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`wick-h-${index}`}
                        fill={entry.isUp ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)'}
                      />
                    ))}
                  </Bar>
                  <Bar yAxisId="price" dataKey="low" fill="transparent" barSize={1}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`wick-l-${index}`}
                        fill={entry.isUp ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="price"
                    dataKey="bodyHeight"
                    stackId="candle"
                    barSize={data.length > 60 ? 3 : data.length > 20 ? 5 : 8}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`body-${index}`}
                        fill={entry.isUp ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)'}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="var(--mantine-color-dimmed)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </>
              ) : (
                <>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="var(--mantine-color-teal-6)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--mantine-color-teal-6)' }}
                  />
                  <ReferenceLine
                    yAxisId="price"
                    y={avgPrice}
                    stroke="var(--mantine-color-indigo-6)"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    label={{ value: '均線', position: 'right', fill: 'var(--mantine-color-indigo-6)', fontSize: 10 }}
                  />
                </>
              )}

              {currentPrice && (
                <ReferenceLine
                  yAxisId="price"
                  y={currentPrice}
                  stroke="var(--mantine-color-teal-6)"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <Group justify="center" gap="lg">
          {mode === 'line' ? (
            <>
              <Group gap={4}>
                <div
                  style={{
                    width: 16,
                    height: 2,
                    background: 'var(--mantine-color-teal-6)',
                  }}
                />
                <Text size="xs" c="dimmed">收盤價</Text>
              </Group>
              <Group gap={4}>
                <div
                  style={{
                    width: 16,
                    height: 0,
                    borderTop: '1px dashed var(--mantine-color-indigo-6)',
                  }}
                />
                <Text size="xs" c="dimmed">均線</Text>
              </Group>
            </>
          ) : (
            <>
              <Group gap={4}>
                <div style={{ width: 8, height: 12, background: 'var(--mantine-color-red-6)', borderRadius: 2 }} />
                <Text size="xs" c="dimmed">上漲</Text>
              </Group>
              <Group gap={4}>
                <div style={{ width: 8, height: 12, background: 'var(--mantine-color-green-6)', borderRadius: 2 }} />
                <Text size="xs" c="dimmed">下跌</Text>
              </Group>
            </>
          )}
          <Group gap={4}>
            <div style={{ width: 8, height: 12, background: 'var(--mantine-color-gray-5)', opacity: 0.4, borderRadius: 2 }} />
            <Text size="xs" c="dimmed">成交量</Text>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
