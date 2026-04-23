'use client';

import { Badge, Card, Group, Paper, SimpleGrid, Text } from '@mantine/core';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatAmount, formatPercent, formatShares } from '@/lib/utils';

interface StockCardProps {
  stock: StockWithCalculations;
  usdRate?: number;
  privacyMode?: boolean;
}

const MASK = '****';

export default function StockCard({ stock, usdRate = 0, privacyMode = false }: StockCardProps) {
  const isProfit = (stock.totalProfit || 0) >= 0;
  const isUS = stock.market === 'US';

  const TWDLine = ({ usd, rate }: { usd: number; rate: number }) => {
    if (rate <= 0 || privacyMode) return null;
    return (
      <Text size="10px" c="dimmed">
        ≈ NT$ {Math.round(usd * rate).toLocaleString()}
      </Text>
    );
  };

  return (
    <Card withBorder radius="lg" p="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs">
            <Badge size="xs" color={stock.market === 'TW' ? 'blue' : 'violet'} variant="light">
              {stock.market === 'TW' ? '台股' : '美股'}
            </Badge>
            <Text fw={700}>{stock.symbol}</Text>
          </Group>
          <Text size="sm" c="dimmed" mt={2}>{stock.name}</Text>
        </div>
        <Paper
          px="xs"
          py={4}
          radius="md"
          bg={isProfit ? 'var(--mantine-color-teal-light)' : 'var(--mantine-color-red-light)'}
        >
          <Group gap={4} wrap="nowrap">
            {privacyMode ? (
              <Text size="sm" fw={500} c="dimmed">{MASK}</Text>
            ) : (
              <>
                {isProfit
                  ? <TrendingUp size={14} color="var(--mantine-color-teal-6)" />
                  : <TrendingDown size={14} color="var(--mantine-color-red-6)" />
                }
                <Text size="sm" fw={500} c={isProfit ? 'teal' : 'red'}>
                  {formatPercent(stock.totalProfitPercent || 0)}
                </Text>
              </>
            )}
          </Group>
        </Paper>
      </Group>

      <SimpleGrid cols={2} spacing="sm" mt="md">
        <div>
          <Text size="xs" c="dimmed">目前價格</Text>
          <Text fw={600}>
            {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
          </Text>
          {isUS && stock.currentPrice ? <TWDLine usd={stock.currentPrice} rate={usdRate} /> : null}
        </div>
        <div>
          <Text size="xs" c="dimmed">平均成本</Text>
          <Text fw={600}>
            {privacyMode ? MASK : formatCurrency(stock.averagePrice, stock.market)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">持有股數</Text>
          <Text fw={600}>{formatShares(stock.totalShares, stock.market)}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">未實現損益</Text>
          <Text fw={600} c={isProfit ? 'teal' : 'red'}>
            {privacyMode
              ? MASK
              : stock.totalProfit !== undefined
                ? formatAmount(stock.totalProfit, stock.market)
                : '-'
            }
          </Text>
          {!privacyMode && isUS && stock.totalProfit !== undefined
            ? <TWDLine usd={stock.totalProfit} rate={usdRate} />
            : null}
        </div>
      </SimpleGrid>
    </Card>
  );
}
