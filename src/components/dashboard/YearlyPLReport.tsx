'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatNumber, formatAmount } from '@/lib/utils';

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

  const yearlyStockPL = stocks
    .map((s) => {
      const sales = (s.sales || []).filter(
        (sale) => new Date(sale.date).getFullYear() === selectedYear,
      );
      if (sales.length === 0) return null;
      const pl = sales.reduce(
        (sum, sale) =>
          sum + (sale.price * sale.shares - (sale.commission || 0) - (sale.tax || 0) - sale.avgCostAtSale * sale.shares),
        0,
      );
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

  const yearlyTotalPL = yearlyStockPL.reduce((sum, s) => sum + s.realizedPLTWD, 0);

  const unrealizedPL = stocks.reduce((sum, s) => {
    if (s.totalProfit === undefined) return sum;
    return sum + toTWD(s.totalProfit, s.market);
  }, 0);

  const allYears = new Set<number>();
  stocks.forEach((s) => {
    (s.sales || []).forEach((sale) => {
      allYears.add(new Date(sale.date).getFullYear());
    });
  });
  allYears.add(currentYear);
  const sortedYears = Array.from(allYears).sort((a, b) => b - a);
  const minYear = sortedYears[sortedYears.length - 1];
  const maxYear = sortedYears[0];

  return (
    <Card withBorder radius="lg" p={0}>
      <Group
        justify="space-between"
        px="md"
        py="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Title order={6}>年度損益報表</Title>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            onClick={() => setSelectedYear((y) => Math.max(y - 1, minYear))}
            disabled={selectedYear <= minYear}
            aria-label="上一年"
          >
            <ChevronLeft size={16} />
          </ActionIcon>
          <Text size="sm" fw={500} style={{ minWidth: 48, textAlign: 'center' }}>
            {selectedYear}
          </Text>
          <ActionIcon
            variant="subtle"
            onClick={() => setSelectedYear((y) => Math.min(y + 1, maxYear))}
            disabled={selectedYear >= maxYear}
            aria-label="下一年"
          >
            <ChevronRight size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Stack p="md" gap="md">
        <SimpleGrid cols={2} spacing="xs">
          <Paper p="xs" radius="md" bg="var(--mantine-color-default-hover)">
            <Text size="xs" c="dimmed">{selectedYear} 年已實現損益</Text>
            <Text size="lg" fw={700} c={yearlyTotalPL >= 0 ? 'teal' : 'red'}>
              {privacyMode ? MASK : `NT$ ${formatNumber(yearlyTotalPL, 0)}`}
            </Text>
          </Paper>
          {selectedYear === currentYear && (
            <Paper p="xs" radius="md" bg="var(--mantine-color-default-hover)">
              <Text size="xs" c="dimmed">目前未實現損益</Text>
              <Text size="lg" fw={700} c={unrealizedPL >= 0 ? 'teal' : 'red'}>
                {privacyMode ? MASK : `NT$ ${formatNumber(unrealizedPL, 0)}`}
              </Text>
            </Paper>
          )}
        </SimpleGrid>

        {yearlyStockPL.length > 0 ? (
          <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed">已實現明細</Text>
            {yearlyStockPL.map((s) => (
              <Paper
                key={`${s.market}_${s.symbol}`}
                px="sm"
                py="xs"
                radius="md"
                bg="var(--mantine-color-default-hover)"
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Badge size="xs" color={s.market === 'TW' ? 'blue' : 'violet'} variant="light">
                      {s.market}
                    </Badge>
                    <Text size="sm" fw={500} truncate>{s.symbol}</Text>
                    <Text size="xs" c="dimmed" truncate>{s.name}</Text>
                  </Group>
                  <Stack gap={0} align="flex-end">
                    {privacyMode ? (
                      <Text size="sm" c="dimmed">{MASK}</Text>
                    ) : (
                      <>
                        <Group gap={4} wrap="nowrap">
                          {s.realizedPL >= 0
                            ? <TrendingUp size={12} color="var(--mantine-color-teal-6)" />
                            : <TrendingDown size={12} color="var(--mantine-color-red-6)" />
                          }
                          <Text size="sm" fw={500} c={s.realizedPL >= 0 ? 'teal' : 'red'}>
                            {formatAmount(s.realizedPL, s.market as 'TW' | 'US')}
                          </Text>
                        </Group>
                        <Text size="10px" c="dimmed">
                          {s.salesCount} 筆 / {s.totalSharesSold} 股
                        </Text>
                      </>
                    )}
                  </Stack>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Text ta="center" size="sm" c="dimmed" py="md">
            {selectedYear} 年尚無賣出紀錄
          </Text>
        )}
      </Stack>
    </Card>
  );
}
