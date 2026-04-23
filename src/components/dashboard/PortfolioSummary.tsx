'use client';

import { Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatNumber, formatPercent, calculateRealizedPL } from '@/lib/utils';

interface PortfolioSummaryProps {
  stocks: StockWithCalculations[];
  usdRate?: number;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
}

const MASK = '＊＊＊＊';

type SummaryCard = {
  title: string;
  value: string;
  subtitle?: string;
  extra?: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  textColor: string;
  sensitive: boolean;
};

export default function PortfolioSummary({
  stocks,
  usdRate = 0,
  privacyMode,
  onTogglePrivacy,
}: PortfolioSummaryProps) {
  const toTWD = (amount: number, market: string) =>
    market === 'US' && usdRate > 0 ? amount * usdRate : amount;

  const twCost = stocks.filter((s) => s.market === 'TW').reduce((sum, s) => sum + s.totalCost, 0);
  const usCost = stocks.filter((s) => s.market === 'US').reduce((sum, s) => sum + s.totalCost, 0);

  const usCostTWD = stocks.filter((s) => s.market === 'US').reduce((sum, s) => {
    return sum + s.purchases.reduce((pSum, p) => {
      const rate = p.exchangeRate || usdRate;
      return pSum + (p.shares * p.price + (p.commission || 0)) * rate;
    }, 0);
  }, 0);

  const totalValue = stocks.reduce((sum, s) => sum + toTWD(s.totalValue || 0, s.market), 0);
  const totalCostTWD = twCost + usCostTWD;
  const totalProfit = totalValue - totalCostTWD;
  const totalProfitPercent = totalCostTWD > 0 ? ((totalValue - totalCostTWD) / totalCostTWD) * 100 : 0;
  const stockCount = stocks.length;

  const stockPricePL = stocks.reduce((sum, s) => {
    if (s.currentPrice === undefined) return sum;
    const pl = (s.currentPrice - s.averagePrice) * s.totalShares;
    return sum + (s.market === 'US' && usdRate > 0 ? pl * usdRate : pl);
  }, 0);

  const fxPL = stocks.filter((s) => s.market === 'US').reduce((sum, s) => {
    return sum + s.purchases.reduce((pSum, p) => {
      const purchaseRate = p.exchangeRate || usdRate;
      return pSum + (p.shares * p.price + (p.commission || 0)) * (usdRate - purchaseRate);
    }, 0);
  }, 0);

  const costDisplay = () => `NT$ ${formatNumber(totalCostTWD, 0)}`;
  const stockPricePLPercent = totalCostTWD > 0 ? (stockPricePL / totalCostTWD) * 100 : 0;
  const fxPLPercent = totalCostTWD > 0 ? (fxPL / totalCostTWD) * 100 : 0;

  const totalRealizedPL = stocks.reduce((sum, s) => {
    const pl = calculateRealizedPL(s.sales || []);
    return sum + (s.market === 'US' && usdRate > 0 ? pl * usdRate : pl);
  }, 0);

  const avgPurchaseRate = usCost > 0 ? usCostTWD / usCost : 0;

  const cards: SummaryCard[] = [
    {
      title: '總投入成本',
      value: costDisplay(),
      icon: DollarSign,
      color: 'blue',
      textColor: 'blue',
      sensitive: true,
    },
    {
      title: '目前總市值',
      value: `NT$ ${formatNumber(totalValue, 0)}`,
      icon: BarChart3,
      color: 'violet',
      textColor: 'violet',
      sensitive: true,
    },
    {
      title: '持股數量',
      value: `${stockCount} 檔`,
      icon: BarChart3,
      color: 'yellow',
      textColor: 'yellow',
      sensitive: false,
    },
    {
      title: '股價損益',
      value: `NT$ ${formatNumber(stockPricePL, 0)}`,
      subtitle: formatPercent(stockPricePLPercent),
      icon: stockPricePL >= 0 ? TrendingUp : TrendingDown,
      color: stockPricePL >= 0 ? 'teal' : 'red',
      textColor: stockPricePL >= 0 ? 'teal' : 'red',
      sensitive: true,
    },
    {
      title: '匯率損益',
      value: `NT$ ${formatNumber(fxPL, 0)}`,
      subtitle: formatPercent(fxPLPercent),
      extra: avgPurchaseRate > 0
        ? `平均成本 ${avgPurchaseRate.toFixed(2)} → 目前 ${usdRate.toFixed(2)}`
        : undefined,
      icon: fxPL >= 0 ? TrendingUp : TrendingDown,
      color: fxPL >= 0 ? 'teal' : 'red',
      textColor: fxPL >= 0 ? 'teal' : 'red',
      sensitive: true,
    },
    {
      title: '未實現損益',
      value: `NT$ ${formatNumber(totalProfit, 0)}`,
      subtitle: formatPercent(totalProfitPercent),
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: totalProfit >= 0 ? 'teal' : 'red',
      textColor: totalProfit >= 0 ? 'teal' : 'red',
      sensitive: true,
    },
    {
      title: '已實現損益',
      value: `NT$ ${formatNumber(totalRealizedPL, 0)}`,
      icon: totalRealizedPL >= 0 ? CheckCircle : TrendingDown,
      color: totalRealizedPL >= 0 ? 'teal' : 'red',
      textColor: totalRealizedPL >= 0 ? 'teal' : 'red',
      sensitive: true,
    },
  ];

  return (
    <Stack gap="xs">
      <Group justify="flex-end">
        <Button
          variant="subtle"
          color="gray"
          size="compact-xs"
          leftSection={privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
          onClick={onTogglePrivacy}
        >
          {privacyMode ? '顯示金額' : '隱藏金額'}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing={{ base: 'xs', sm: 'md' }}>
        {cards.map((card) => {
          const Icon = card.icon;
          const showMask = privacyMode && card.sensitive;
          return (
            <Card key={card.title} withBorder radius="lg" p={{ base: 'sm', sm: 'md' }}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                  <Text size="xs" c="dimmed">{card.title}</Text>
                  <Text fz={{ base: 'lg', sm: 'xl' }} fw={700} c={card.textColor} truncate>
                    {showMask ? MASK : card.value}
                  </Text>
                  {card.subtitle && (
                    <Text size="xs" fw={500} c={card.textColor}>
                      {showMask ? '' : card.subtitle}
                    </Text>
                  )}
                  {card.extra && !showMask && (
                    <Text size="10px" c="dimmed">{card.extra}</Text>
                  )}
                </Stack>
                <ThemeIcon
                  color={card.color}
                  variant="light"
                  size={44}
                  radius="md"
                  visibleFrom="sm"
                >
                  <Icon size={22} />
                </ThemeIcon>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
