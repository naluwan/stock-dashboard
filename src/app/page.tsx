'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Button, Card, Center, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { BrainCircuit, DollarSign } from 'lucide-react';
import Header from '@/components/layout/Header';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import StockCard from '@/components/dashboard/StockCard';
import AlertStatusPanel from '@/components/dashboard/AlertStatusPanel';
import PriceChart from '@/components/dashboard/PriceChart';
import YearlyPLReport from '@/components/dashboard/YearlyPLReport';
import PortfolioAnalysisDrawer from '@/components/dashboard/PortfolioAnalysisDrawer';
import { StockWithCalculations, IAlert, IStock } from '@/types';
import { enrichStockWithCalculations } from '@/lib/utils';

export default function DashboardPage() {
  const [stocks, setStocks] = useState<StockWithCalculations[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usdRate, setUsdRate] = useState(0);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [stocksRes, alertsRes, rateRes] = await Promise.all([
        fetch('/api/stocks'),
        fetch('/api/alerts'),
        fetch('/api/exchange-rate'),
      ]);

      const stocksData: IStock[] = await stocksRes.json();
      const alertsData: IAlert[] = await alertsRes.json();

      try {
        const rateData = await rateRes.json();
        setUsdRate(rateData.rate || 0);
      } catch { /* ignore */ }

      if (stocksData.length > 0) {
        try {
          const symbolsParam = JSON.stringify(
            stocksData.map((s) => ({ symbol: s.symbol, market: s.market })),
          );
          const pricesRes = await fetch(`/api/prices?symbols=${encodeURIComponent(symbolsParam)}`);
          const pricesData = await pricesRes.json();

          const enrichedStocks = stocksData.map((stock) => {
            const priceKey = `${stock.market}_${stock.symbol}`;
            const priceData = pricesData[priceKey];
            return enrichStockWithCalculations(stock, priceData?.currentPrice);
          });

          setStocks(enrichedStocks);
        } catch {
          setStocks(stocksData.map((stock) => enrichStockWithCalculations(stock)));
        }
      } else {
        setStocks([]);
      }

      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader color="teal" />
      </Center>
    );
  }

  const hasHoldings = stocks.some((s) => s.totalShares > 0);

  return (
    <div>
      <Header
        title="投資組合總覽"
        subtitle="即時監控你的股票投資"
        onRefresh={fetchData}
        rightSection={
          hasHoldings && (
            <Button
              color="indigo"
              variant="light"
              size="sm"
              leftSection={<BrainCircuit size={16} />}
              onClick={() => setAnalysisOpen(true)}
            >
              AI 分析
            </Button>
          )
        }
      />

      <PortfolioAnalysisDrawer
        opened={analysisOpen}
        onClose={() => setAnalysisOpen(false)}
      />

      <Stack gap="lg" p={{ base: 'md', sm: 'xl' }}>
        {usdRate > 0 && (
          <Group gap={6}>
            <DollarSign size={14} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              今日匯率：USD/TWD = <Text component="strong" size="xs" c="bright">{usdRate.toFixed(2)}</Text>
            </Text>
          </Group>
        )}

        <PortfolioSummary
          stocks={stocks}
          usdRate={usdRate}
          privacyMode={privacyMode}
          onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        />

        <Box
          style={{
            display: 'grid',
            gap: 'var(--mantine-spacing-lg)',
            gridTemplateColumns: 'minmax(0, 1fr)',
          }}
          className="dashboard-grid"
        >
          <Box style={{ minWidth: 0 }}>
            {stocks.length === 0 ? (
              <Card withBorder radius="lg" p="xl">
                <Center>
                  <Stack align="center" gap={4}>
                    <Text c="dimmed" size="lg">尚未新增任何持股</Text>
                    <Text c="dimmed" size="sm">前往「持股管理」開始記錄</Text>
                  </Stack>
                </Center>
              </Card>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {stocks.map((stock) => (
                  <StockCard key={stock._id} stock={stock} usdRate={usdRate} privacyMode={privacyMode} />
                ))}
              </SimpleGrid>
            )}
          </Box>

          <Stack gap="lg" style={{ minWidth: 0 }}>
            <PriceChart stocks={stocks} />
            <YearlyPLReport stocks={stocks} usdRate={usdRate} privacyMode={privacyMode} />
            <AlertStatusPanel alerts={alerts} />
          </Stack>
        </Box>
      </Stack>
    </div>
  );
}
