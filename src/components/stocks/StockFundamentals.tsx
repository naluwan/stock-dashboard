'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Center,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { Market } from '@/types';
import { formatNumber } from '@/lib/utils';

interface QuarterlyData {
  date: string;
  value: number | null;
}

interface DividendItem {
  year: number;
  amount: number;
}

interface FundamentalsData {
  symbol: string;
  market: Market;
  marketCap: number | null;
  peTrailing: number | null;
  peForward: number | null;
  eps: number | null;
  dividendYield: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  priceOpen: number | null;
  priceHigh: number | null;
  priceLow: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  roe: number | null;
  roa: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  quarterlyRevenue: QuarterlyData[];
  quarterlyEarnings: QuarterlyData[];
  dividends: DividendItem[];
}

interface InstitutionalDay {
  date: string;
  foreignNet: number;
  trustNet: number;
  dealerNet: number;
  totalNet: number;
}

interface InstitutionalData {
  data: InstitutionalDay[];
  message?: string;
}

interface Props {
  symbol: string;
  market: Market;
}

const NA = '—';

function formatMarketCap(v: number | null, market: Market): string {
  if (v === null) return NA;
  const currency = market === 'TW' ? 'NT$' : 'US$';
  // 用「億」單位（台股慣用） / 「B」單位（美股慣用）
  if (market === 'TW') {
    if (v >= 1e8) return `${currency} ${(v / 1e8).toFixed(2)} 億`;
    if (v >= 1e4) return `${currency} ${(v / 1e4).toFixed(0)} 萬`;
  } else {
    if (v >= 1e12) return `${currency} ${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${currency} ${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${currency} ${(v / 1e6).toFixed(2)}M`;
  }
  return `${currency} ${formatNumber(v, 0)}`;
}

function formatPercentValue(v: number | null): string {
  if (v === null) return NA;
  // Yahoo 回傳的 yield 是 decimal (0.025) 但有時是 percent (2.5)
  // 啟發式：< 1 視為 decimal
  const abs = Math.abs(v);
  const pct = abs < 1 ? v * 100 : v;
  return `${pct >= 0 ? '' : ''}${pct.toFixed(2)}%`;
}

function formatPrice(v: number | null, market: Market): string {
  if (v === null) return NA;
  const currency = market === 'TW' ? 'NT$' : 'US$';
  return `${currency} ${v.toFixed(2)}`;
}

function formatShares(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n > 0 ? '+' : '-';
  // 顯示張（1 張 = 1000 股）
  if (abs >= 1000) {
    const lots = Math.round(abs / 1000);
    return `${sign}${formatNumber(lots, 0)} 張`;
  }
  return `${sign}${formatNumber(abs, 0)} 股`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  const isNA = value === NA || value.includes('—');
  return (
    <Stack gap={2}>
      <Text size="10px" c="dimmed">{label}</Text>
      <Text size="sm" fw={600} c={isNA ? 'dimmed' : undefined}>{value}</Text>
    </Stack>
  );
}

export default function StockFundamentals({ symbol, market }: Props) {
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
  const [institutional, setInstitutional] = useState<InstitutionalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fundRes, instRes] = await Promise.all([
        fetch(`/api/stocks/fundamentals?symbol=${encodeURIComponent(symbol)}&market=${market}`),
        fetch(`/api/stocks/institutional-trading?symbol=${encodeURIComponent(symbol)}&market=${market}`),
      ]);

      if (!fundRes.ok) {
        setError('基本面讀取失敗');
        return;
      }
      const fundData: FundamentalsData = await fundRes.json();
      setFundamentals(fundData);

      if (instRes.ok) {
        const instData: InstitutionalData = await instRes.json();
        setInstitutional(instData);
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, market]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <Card withBorder radius="lg" p="md">
        <Center py="md">
          <Loader size="sm" />
        </Center>
      </Card>
    );
  }

  if (error || !fundamentals) {
    return (
      <Card withBorder radius="lg" p="md">
        <Text size="sm" c="red">{error || '無資料'}</Text>
      </Card>
    );
  }

  const f = fundamentals;
  const showInst = market === 'TW' && institutional && institutional.data.length > 0;

  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="md">
        <Title order={6}>基本面</Title>

        {/* 估值 */}
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">估值</Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatRow label="市值" value={formatMarketCap(f.marketCap, market)} />
            <StatRow label="本益比 (TTM)" value={f.peTrailing !== null ? f.peTrailing.toFixed(2) : NA} />
            <StatRow label="預估本益比" value={f.peForward !== null ? f.peForward.toFixed(2) : NA} />
            <StatRow label="EPS (TTM)" value={f.eps !== null ? f.eps.toFixed(2) : NA} />
            <StatRow label="殖利率" value={formatPercentValue(f.dividendYield)} />
            <StatRow label="52W 高" value={formatPrice(f.weekHigh52, market)} />
            <StatRow label="52W 低" value={formatPrice(f.weekLow52, market)} />
            <StatRow label="今日開盤" value={formatPrice(f.priceOpen, market)} />
          </SimpleGrid>
        </Stack>

        {/* 獲利率 */}
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">獲利率（TTM）</Text>
          <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
            <StatRow label="毛利率" value={formatPercentValue(f.grossMargin)} />
            <StatRow label="營益率" value={formatPercentValue(f.operatingMargin)} />
            <StatRow label="淨利率" value={formatPercentValue(f.profitMargin)} />
            <StatRow label="ROE" value={formatPercentValue(f.roe)} />
            <StatRow label="ROA" value={formatPercentValue(f.roa)} />
          </SimpleGrid>
        </Stack>

        {/* 成長 */}
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">成長（YoY）</Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatRow label="營收成長" value={formatPercentValue(f.revenueGrowth)} />
            <StatRow label="盈餘成長" value={formatPercentValue(f.earningsGrowth)} />
          </SimpleGrid>
        </Stack>

        {/* 季營收 / 季 EPS */}
        {(f.quarterlyRevenue.length > 0 || f.quarterlyEarnings.length > 0) && (
          <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed">近 4 季財報</Text>
            <ScrollArea>
              <Table withTableBorder withColumnBorders striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>季別</Table.Th>
                    <Table.Th ta="right">營收</Table.Th>
                    <Table.Th ta="right">EPS</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(f.quarterlyRevenue.length > 0 ? f.quarterlyRevenue : f.quarterlyEarnings).map(
                    (q, i) => {
                      const eps = f.quarterlyEarnings[i];
                      return (
                        <Table.Tr key={q.date}>
                          <Table.Td>{q.date}</Table.Td>
                          <Table.Td ta="right">
                            {q.value !== null ? formatNumber(q.value, 0) : NA}
                          </Table.Td>
                          <Table.Td ta="right">
                            {eps?.value !== null && eps?.value !== undefined
                              ? eps.value.toFixed(2)
                              : NA}
                          </Table.Td>
                        </Table.Tr>
                      );
                    },
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}

        {/* 股利 */}
        {f.dividends.length > 0 && (
          <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed">近 5 年股利</Text>
            <ScrollArea>
              <Table withTableBorder withColumnBorders striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>年度</Table.Th>
                    <Table.Th ta="right">每股配發（含現金/股票）</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {f.dividends.map((d) => (
                    <Table.Tr key={d.year}>
                      <Table.Td>{d.year}</Table.Td>
                      <Table.Td ta="right">{d.amount.toFixed(3)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}

        {/* 三大法人（台股 only） */}
        {market === 'TW' && (
          <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed">三大法人買賣超（近 5 個交易日）</Text>
            {showInst ? (
              <ScrollArea>
                <Table withTableBorder withColumnBorders striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>日期</Table.Th>
                      <Table.Th ta="right">外資</Table.Th>
                      <Table.Th ta="right">投信</Table.Th>
                      <Table.Th ta="right">自營商</Table.Th>
                      <Table.Th ta="right">合計</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {institutional!.data.map((d) => (
                      <Table.Tr key={d.date}>
                        <Table.Td>{d.date}</Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" c={d.foreignNet > 0 ? 'red.6' : d.foreignNet < 0 ? 'teal.6' : undefined}>
                            {formatShares(d.foreignNet)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" c={d.trustNet > 0 ? 'red.6' : d.trustNet < 0 ? 'teal.6' : undefined}>
                            {formatShares(d.trustNet)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" c={d.dealerNet > 0 ? 'red.6' : d.dealerNet < 0 ? 'teal.6' : undefined}>
                            {formatShares(d.dealerNet)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" fw={600} c={d.totalNet > 0 ? 'red.6' : d.totalNet < 0 ? 'teal.6' : undefined}>
                            {formatShares(d.totalNet)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            ) : (
              <Text size="sm" c="dimmed">
                {institutional?.message || '查無近期資料（可能上櫃股或 TWSE 暫無資料）'}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
