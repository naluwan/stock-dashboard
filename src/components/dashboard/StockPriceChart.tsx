'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import {
  Card,
  Center,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Market } from '@/types';

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

type ChartMode = 'line' | 'candle';

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

// 顏色：台灣慣例「紅漲綠跌」
const COLOR_UP = '#ef4444';
const COLOR_DOWN = '#22c55e';
const COLOR_LINE = '#10b981'; // 線圖收盤線
const COLOR_BB_BAND = '#8b5cf6'; // 布林通道紫
const COLOR_BB_MID = '#f59e0b'; // 中軸（20MA）橘

function toTime(dateStr: string): UTCTimestamp {
  return Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
}

// 簡單版布林通道（period=20, std=2）
function calculateBollinger(closes: number[]) {
  const period = 20;
  const stdMul = 2;
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    middle.push(mean);
    upper.push(mean + stdMul * std);
    lower.push(mean - stdMul * std);
  }
  return { upper, middle, lower };
}

export default function StockPriceChart({ symbol, market, currentPrice }: StockPriceChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<ISeriesApi<any>[]>([]);

  const [data, setData] = useState<HistoryDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [selectedTime, setSelectedTime] = useState('1d');
  const [mode, setMode] = useState<ChartMode>('candle');
  const [showBB, setShowBB] = useState(true);

  const currentTimeOption = TIME_OPTIONS.find((t) => t.key === selectedTime) || TIME_OPTIONS[0];

  // 抓資料
  useEffect(() => {
    let cancelled = false;
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
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(json.data || []);
          setIsFallback(json.fallback || false);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, [symbol, market, selectedTime, currentTimeOption.days, currentTimeOption.intraday]);

  // 建 chart
  useEffect(() => {
    if (!containerRef.current) return;

    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.08)';

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.3 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: currentTimeOption.intraday,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]); // 切換主題時重建（因為 layout colors 變動）

  // 更新 series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.length === 0) return;

    // 清掉舊 series
    for (const s of seriesRefs.current) {
      try { chart.removeSeries(s); } catch { /* ignore */ }
    }
    seriesRefs.current = [];

    // 主圖：K 線 or 線圖
    if (mode === 'candle') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: COLOR_UP,
        downColor: COLOR_DOWN,
        borderUpColor: COLOR_UP,
        borderDownColor: COLOR_DOWN,
        wickUpColor: COLOR_UP,
        wickDownColor: COLOR_DOWN,
      });
      candleSeries.setData(
        data.map((d) => ({
          time: toTime(d.date),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })),
      );
      seriesRefs.current.push(candleSeries);
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: COLOR_LINE,
        lineWidth: 2,
        priceLineVisible: false,
      });
      lineSeries.setData(
        data.map((d) => ({ time: toTime(d.date), value: d.close })),
      );
      seriesRefs.current.push(lineSeries);
    }

    // 成交量（在主圖下半部）
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });
    volumeSeries.setData(
      data.map((d) => ({
        time: toTime(d.date),
        value: d.volume,
        color: d.close >= d.open
          ? 'rgba(239, 68, 68, 0.4)'
          : 'rgba(34, 197, 94, 0.4)',
      })),
    );
    seriesRefs.current.push(volumeSeries);

    // 布林通道
    if (showBB && data.length >= 20) {
      const closes = data.map((d) => d.close);
      const bb = calculateBollinger(closes);

      const filterValid = (arr: (number | null)[]) =>
        data
          .map((d, i) => (arr[i] !== null ? { time: toTime(d.date), value: arr[i]! } : null))
          .filter((x): x is { time: UTCTimestamp; value: number } => x !== null);

      const upperSeries = chart.addSeries(LineSeries, {
        color: COLOR_BB_BAND,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      upperSeries.setData(filterValid(bb.upper));
      seriesRefs.current.push(upperSeries);

      const middleSeries = chart.addSeries(LineSeries, {
        color: COLOR_BB_MID,
        lineWidth: 1,
        lineStyle: 2, // dashed
        lastValueVisible: false,
        priceLineVisible: false,
      });
      middleSeries.setData(filterValid(bb.middle));
      seriesRefs.current.push(middleSeries);

      const lowerSeries = chart.addSeries(LineSeries, {
        color: COLOR_BB_BAND,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      lowerSeries.setData(filterValid(bb.lower));
      seriesRefs.current.push(lowerSeries);
    }

    // 現價參考線
    if (currentPrice) {
      const priceLineSeries = seriesRefs.current[0];
      if (priceLineSeries) {
        priceLineSeries.createPriceLine({
          price: currentPrice,
          color: COLOR_LINE,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '現價',
        });
      }
    }

    // 自動 fit
    chart.timeScale().fitContent();
  }, [data, mode, showBB, currentPrice]);

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
        { value: 'candle', label: <BarChart3 size={14} /> },
        { value: 'line', label: <TrendingUp size={14} /> },
      ]}
    />
  );

  const isIntraday = currentTimeOption.intraday && !isFallback;

  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Text fw={500} size="sm">價格走勢</Text>
            {isIntraday && (
              <Text size="10px" c="dimmed">
                {market === 'US' ? '(美東時間)' : '(台灣時間)'}
              </Text>
            )}
          </Group>
          <Group gap="xs" wrap="wrap">
            <Switch
              size="xs"
              label="布林"
              checked={showBB}
              onChange={(e) => setShowBB(e.currentTarget.checked)}
            />
            {timeSelector}
            {modeSelector}
          </Group>
        </Group>

        {isFallback && (
          <Text ta="center" size="xs" c="yellow">
            非交易時間，顯示最近交易日資料
          </Text>
        )}

        <div style={{ position: 'relative', minHeight: 320 }}>
          {isLoading && (
            <Center
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.05)',
                zIndex: 1,
              }}
            >
              <Loader color="teal" size="sm" />
            </Center>
          )}
          {!isLoading && data.length === 0 && (
            <Center h={320}>
              <Text c="dimmed" size="sm">
                {currentTimeOption.intraday ? '目前無當日分時資料（可能非交易時間）' : '暫無歷史資料'}
              </Text>
            </Center>
          )}
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: 320,
              display: data.length === 0 && !isLoading ? 'none' : 'block',
            }}
          />
        </div>

        <Group justify="center" gap="md" wrap="wrap">
          {mode === 'candle' && (
            <>
              <Group gap={4}>
                <div style={{ width: 8, height: 12, background: COLOR_UP, borderRadius: 2 }} />
                <Text size="xs" c="dimmed">上漲</Text>
              </Group>
              <Group gap={4}>
                <div style={{ width: 8, height: 12, background: COLOR_DOWN, borderRadius: 2 }} />
                <Text size="xs" c="dimmed">下跌</Text>
              </Group>
            </>
          )}
          {mode === 'line' && (
            <Group gap={4}>
              <div style={{ width: 16, height: 2, background: COLOR_LINE }} />
              <Text size="xs" c="dimmed">收盤價</Text>
            </Group>
          )}
          {showBB && (
            <Group gap="md">
              <Group gap={4}>
                <div style={{ width: 16, height: 1, background: COLOR_BB_BAND }} />
                <Text size="xs" c="dimmed">布林通道上下軌</Text>
              </Group>
              <Group gap={4}>
                <div
                  style={{
                    width: 16,
                    height: 0,
                    borderTop: `1px dashed ${COLOR_BB_MID}`,
                  }}
                />
                <Text size="xs" c="dimmed">20 日均線</Text>
              </Group>
            </Group>
          )}
          <Group gap={4}>
            <div style={{ width: 8, height: 12, background: 'rgba(148,163,184,0.4)', borderRadius: 2 }} />
            <Text size="xs" c="dimmed">成交量</Text>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
