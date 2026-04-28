'use client';

import { useState, useEffect } from 'react';
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

type Stage = 'idle' | 'preparing' | 'thinking' | 'saving';

const STAGE_LABEL: Record<Exclude<Stage, 'idle'>, { title: string; hint: string }> = {
  preparing: { title: '正在抓歷史 + 算指標...', hint: 'Yahoo + 技術指標，約 2-5 秒' },
  thinking: { title: 'AI 分析中...', hint: 'gpt-4o-mini 思考策略，約 5-15 秒' },
  saving: { title: '儲存分析結果...', hint: '寫入歷史紀錄' },
};

export default function StockAnalysis({
  symbol, name, market, averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice,
}: StockAnalysisProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [hasLatest, setHasLatest] = useState(false);

  const isAnalyzing = stage !== 'idle';

  // mount 時嘗試撈最新一筆（如有）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/stocks/analysis/latest?symbol=${encodeURIComponent(symbol)}&market=${market}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data && data.analysis) {
          setHasLatest(true);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [symbol, market]);

  const loadLatest = async () => {
    setIsLoadingLatest(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stocks/analysis/latest?symbol=${encodeURIComponent(symbol)}&market=${market}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '讀取失敗');
        return;
      }
      if (data && data.analysis) {
        setAnalysis(data.analysis);
        setAnalyzedAt(data.createdAt);
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setIsLoadingLatest(false);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setAnalysis(null);
    setAnalyzedAt(null);

    try {
      // ① prepare
      setStage('preparing');
      const prepRes = await fetch('/api/stocks/analysis/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol, name, market, averagePrice, totalShares, totalProfit, totalProfitPercent, currentPrice,
        }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        setError(prepData.error || '準備分析失敗');
        return;
      }
      const { prompt, snapshot } = prepData;

      // ② openai (透過 Edge 代理)
      setStage('thinking');
      const aiRes = await fetch('/api/portfolio/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemMessage:
            '你是一位說話直白的台灣股票分析師，像朋友聊天一樣給建議。不要用專業術語，要用一般人聽得懂的話。請用繁體中文回答。',
        }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) {
        setError(aiData.error || 'AI 分析失敗');
        return;
      }
      const aiAnalysis: string = aiData.analysis;

      // ③ save
      setStage('saving');
      const saveRes = await fetch('/api/stocks/analysis/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, market, name, analysis: aiAnalysis, snapshot }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        // 即使存失敗，仍先把分析顯示出來（避免使用者看不到結果）
        setAnalysis(aiAnalysis);
        setAnalyzedAt(new Date().toISOString());
        setError(saveData.error || '儲存失敗（但分析已產生）');
        setHasLatest(true);
        return;
      }

      setAnalysis(saveData.analysis);
      setAnalyzedAt(saveData.createdAt);
      setHasLatest(true);
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setStage('idle');
    }
  };

  const close = () => {
    setAnalysis(null);
    setAnalyzedAt(null);
    setError(null);
  };

  // 還沒打開分析卡片
  if (!analysis && !isAnalyzing && !error) {
    return (
      <Group gap="xs">
        <Button
          size="compact-xs"
          color="indigo"
          leftSection={<BrainCircuit size={14} />}
          onClick={handleAnalyze}
        >
          AI 策略分析
        </Button>
        {hasLatest && (
          <Button
            size="compact-xs"
            variant="subtle"
            color="indigo"
            loading={isLoadingLatest}
            onClick={loadLatest}
          >
            看上次分析
          </Button>
        )}
      </Group>
    );
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      mt="sm"
      style={{ borderColor: 'var(--mantine-color-indigo-3)' }}
    >
      <Group
        justify="space-between"
        px="md"
        py="xs"
        wrap="wrap"
        gap="xs"
        style={{
          borderBottom: '1px solid var(--mantine-color-indigo-3)',
          background: 'var(--mantine-color-indigo-light)',
        }}
      >
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon color="indigo" size="sm" variant="transparent">
            <BrainCircuit size={16} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="sm" fw={600} c="indigo">
              AI 策略分析 — {symbol} {name}
            </Text>
            {analyzedAt && (
              <Text size="10px" c="indigo.7">
                分析時間：{formatTime(analyzedAt)}
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap="xs">
          {!isAnalyzing && (
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
            onClick={close}
          >
            <X size={14} />
          </ActionIcon>
        </Group>
      </Group>

      <Box p="md">
        {isAnalyzing && (
          <Center>
            <Stack align="center" gap="xs" py="lg">
              <Loader color="indigo" size="sm" />
              <Text size="sm" c="dimmed">{STAGE_LABEL[stage as Exclude<Stage, 'idle'>].title}</Text>
              <Text size="xs" c="dimmed">{STAGE_LABEL[stage as Exclude<Stage, 'idle'>].hint}</Text>
            </Stack>
          </Center>
        )}

        {error && (
          <Alert color="red" variant="light" py="xs" mb={analysis ? 'sm' : 0}>
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        {analysis && !isAnalyzing && (
          <Typography>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
          </Typography>
        )}
      </Box>
    </Card>
  );
}
