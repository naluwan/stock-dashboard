'use client';

import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { StockWithCalculations, Sale } from '@/types';
import { formatCurrency, formatAmount, formatNumber, formatShares } from '@/lib/utils';

interface SellHistoryListProps {
  stock: StockWithCalculations;
  onDelete: (saleId: string) => void;
}

export default function SellHistoryList({ stock, onDelete }: SellHistoryListProps) {
  const sales = stock.sales || [];
  const isUS = stock.market === 'US';

  if (sales.length === 0) {
    return (
      <Paper p="lg" radius="md" bg="var(--mantine-color-default-hover)">
        <Text ta="center" c="dimmed" size="sm">此股票尚無賣出紀錄</Text>
      </Paper>
    );
  }

  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const totalRealizedPL = sales.reduce(
    (sum, s) => sum + (s.price * s.shares - (s.commission || 0) - (s.tax || 0) - s.avgCostAtSale * s.shares),
    0,
  );

  const formatDate = (d: Date | string) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
  };

  return (
    <Stack gap="sm">
      <Paper p="sm" radius="md" bg="var(--mantine-color-default-hover)">
        <Group gap="xs" mb={6} wrap="wrap">
          <Badge size="xs" color={stock.market === 'TW' ? 'blue' : 'violet'}>{stock.market}</Badge>
          <Text fw={700}>{stock.symbol}</Text>
          <Text size="sm" c="dimmed">{stock.name}</Text>
        </Group>
        <Group justify="space-between" wrap="wrap">
          <Text size="xs" c="dimmed">共 {sales.length} 筆賣出</Text>
          <Text size="xs" fw={600} c={totalRealizedPL >= 0 ? 'teal' : 'red'}>
            累計已實現損益 {formatAmount(totalRealizedPL, stock.market)}
          </Text>
        </Group>
      </Paper>

      <ScrollArea.Autosize mah="60vh">
        <Stack gap="xs">
          {sortedSales.map((sale: Sale) => {
            const sellProceeds = sale.price * sale.shares - (sale.commission || 0) - (sale.tax || 0);
            const buyCost = sale.avgCostAtSale * sale.shares;
            const pl = sellProceeds - buyCost;
            const plPercent = buyCost > 0 ? (pl / buyCost) * 100 : 0;
            const amount = sale.price * sale.shares;
            const fees = (sale.commission || 0) + (sale.tax || 0);

            return (
              <Card key={sale._id} withBorder radius="md" p="sm">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" fw={500}>{formatDate(sale.date)}</Text>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => sale._id && onDelete(sale._id)}
                    aria-label="刪除此筆賣出紀錄"
                  >
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>

                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                  <div>
                    <Text size="xs" c="dimmed">股數</Text>
                    <Text size="sm" fw={600}>{formatShares(sale.shares, stock.market)}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">賣出價</Text>
                    <Text size="sm" fw={600}>{formatCurrency(sale.price, stock.market)}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">當下成本</Text>
                    <Text size="sm" fw={600}>{formatCurrency(sale.avgCostAtSale, stock.market)}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">總金額</Text>
                    <Text size="sm" fw={600}>{formatAmount(amount, stock.market)}</Text>
                  </div>
                </SimpleGrid>

                {fees > 0 && (
                  <Group gap="md" mt="xs">
                    {(sale.commission || 0) > 0 && (
                      <Text size="10px" c="dimmed">手續費 {formatNumber(sale.commission || 0, 0)}</Text>
                    )}
                    {(sale.tax || 0) > 0 && (
                      <Text size="10px" c="dimmed">交易稅 {formatNumber(sale.tax || 0, 0)}</Text>
                    )}
                    <Text size="10px" c="dimmed">實收 {formatAmount(sellProceeds, stock.market)}</Text>
                  </Group>
                )}

                <Paper
                  p="xs"
                  mt="xs"
                  radius="sm"
                  bg={pl >= 0 ? 'var(--mantine-color-teal-light)' : 'var(--mantine-color-red-light)'}
                >
                  <Group gap={6} wrap="nowrap">
                    {pl >= 0
                      ? <TrendingUp size={12} color="var(--mantine-color-teal-6)" />
                      : <TrendingDown size={12} color="var(--mantine-color-red-6)" />
                    }
                    <Text size="xs" fw={500} c={pl >= 0 ? 'teal' : 'red'}>
                      已實現 {formatAmount(pl, stock.market)}
                    </Text>
                    <Text size="10px" c={pl >= 0 ? 'teal' : 'red'}>
                      ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
                    </Text>
                    {isUS && sale.exchangeRate && (
                      <Text size="10px" c="dimmed" ml="auto">
                        匯率 {formatNumber(sale.exchangeRate, 2)}
                      </Text>
                    )}
                  </Group>
                </Paper>

                {sale.note && (
                  <Text size="11px" c="dimmed" mt="xs">備註：{sale.note}</Text>
                )}
              </Card>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
