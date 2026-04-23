'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Typography,
} from '@mantine/core';
import { BrainCircuit, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StockAnalysisProps {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  averagePrice?: number;
  totalShares?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
  currentPrice?: number;
}

export default function StockAnalysis({
  symbol, name, market, averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice,
}: StockAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch('/api/stocks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol, name, market, averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '分析失敗');
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (!analysis && !isLoading && !error) {
    return (
      <Button
        size="compact-xs"
        color="indigo"
        leftSection={<BrainCircuit size={14} />}
        onClick={handleAnalyze}
      >
        AI 策略分析
      </Button>
    );
  }

  return (
    <Card withBorder radius="lg" p={0} mt="sm" style={{ borderColor: 'var(--mantine-color-indigo-3)' }}>
      <Group
        justify="space-between"
        px="md"
        py="xs"
        style={{
          borderBottom: '1px solid var(--mantine-color-indigo-3)',
          background: 'var(--mantine-color-indigo-light)',
        }}
      >
        <Group gap="xs">
          <ThemeIcon color="indigo" size="sm" variant="transparent">
            <BrainCircuit size={16} />
          </ThemeIcon>
          <Text size="sm" fw={600} c="indigo">
            AI 策略分析 — {symbol} {name}
          </Text>
        </Group>
        <Group gap="xs">
          {!isLoading && (
            <Button
              variant="subtle"
              color="indigo"
              size="compact-xs"
              onClick={handleAnalyze}
            >
              重新分析
            </Button>
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => { setAnalysis(null); setError(null); }}
          >
            <X size={14} />
          </ActionIcon>
        </Group>
      </Group>

      <Box p="md">
        {isLoading && (
          <Center>
            <Stack align="center" gap="xs" py="lg">
              <Loader color="indigo" size="sm" />
              <Text size="sm" c="dimmed">正在分析 {symbol} 的技術指標...</Text>
              <Text size="xs" c="dimmed">計算 RSI、MACD、KD、布林通道等指標，約需 10-15 秒</Text>
            </Stack>
          </Center>
        )}

        {error && (
          <Alert color="red" variant="light" py="xs">
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        {analysis && (
          <Typography>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
          </Typography>
        )}
      </Box>
    </Card>
  );
}
