'use client';

import { Box, Card, ColorSwatch, Group, Stack, Text, Title } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { StockWithCalculations } from '@/types';
import { formatNumber } from '@/lib/utils';

interface PriceChartProps {
  stocks: StockWithCalculations[];
}

const COLORS = [
  'teal.5', 'blue.5', 'violet.5', 'yellow.5', 'red.5',
  'cyan.5', 'pink.5', 'green.5', 'orange.5', 'indigo.5',
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
    <Card withBorder radius="lg" p="md">
      <Title order={6} mb="sm">持股比例</Title>

      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <DonutChart
          data={data}
          size={200}
          thickness={32}
          paddingAngle={3}
          withTooltip
          tooltipDataSource="segment"
          valueFormatter={(v) => `${formatNumber(v, 0)} (${((v / totalValue) * 100).toFixed(1)}%)`}
          chartLabel={formatNumber(totalValue, 0)}
        />
      </Box>

      <Stack gap={4} mt="sm">
        {data.map((entry, index) => (
          <Group key={index} gap={6} wrap="nowrap">
            <ColorSwatch color={`var(--mantine-color-${entry.color.replace('.', '-')})`} size={10} />
            <Text size="xs" truncate style={{ flex: 1 }}>{entry.name}</Text>
            <Text size="xs" c="dimmed">
              {((entry.value / totalValue) * 100).toFixed(1)}%
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
