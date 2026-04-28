'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Typography,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { BrainCircuit, ChevronDown, History, RefreshCw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnalysisDetail {
  _id: string;
  title: string;
  analysis: string;
  createdAt: string;
  usdRate?: number;
}

interface AnalysisListItem {
  _id: string;
  title: string;
  createdAt: string;
  holdingsCount: number;
}

interface PortfolioAnalysisDrawerProps {
  opened: boolean;
  onClose: () => void;
}

type AnalyzeStage = 'idle' | 'preparing' | 'thinking' | 'saving';

const STAGE_LABEL: Record<AnalyzeStage, { title: string; hint: string }> = {
  idle: { title: '', hint: '' },
  preparing: { title: '正在讀取持股 + 抓 90 天歷史...', hint: '從 Yahoo Finance 撈各檔資料 + 算指標，約 3-7 秒' },
  thinking: { title: 'AI 正在分析中...', hint: 'gpt-4o-mini 思考組合風險與建議，約 5-15 秒' },
  saving: { title: '儲存分析結果...', hint: '寫入歷史紀錄' },
};

export default function PortfolioAnalysisDrawer({ opened, onClose }: PortfolioAnalysisDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<AnalyzeStage>('idle');
  const [current, setCurrent] = useState<AnalysisDetail | null>(null);
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAnalyzing = stage !== 'idle';

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portfolio/analyses');
      if (!res.ok) throw new Error('讀取歷史失敗');
      const list: AnalysisListItem[] = await res.json();
      setHistory(list);

      // 預設載入最新一筆當作 current（若有）
      if (list.length > 0 && !current) {
        const latestRes = await fetch(`/api/portfolio/analyses/${list[0]._id}`);
        if (latestRes.ok) {
          const detail: AnalysisDetail = await latestRes.json();
          setCurrent(detail);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (opened) {
      loadHistory();
    }
  }, [opened, loadHistory]);

  const runAnalyze = async () => {
    setError(null);

    try {
      // ① prepare: 讀 DB + 抓 Yahoo + 組 prompt
      setStage('preparing');
      const prepRes = await fetch('/api/portfolio/prepare', { method: 'POST' });
      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        setError(prepData.error || '準備分析資料失敗');
        return;
      }
      const { prompt, snapshot, usdRate } = prepData;

      // ② openai: 透過 Edge 代理呼叫 OpenAI
      setStage('thinking');
      const aiRes = await fetch('/api/portfolio/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) {
        setError(aiData.error || 'AI 分析失敗');
        return;
      }
      const { analysis } = aiData;

      // ③ save: 寫 DB
      setStage('saving');
      const saveRes = await fetch('/api/portfolio/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, snapshot, usdRate }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveData.error || '儲存失敗');
        return;
      }

      setCurrent({
        _id: saveData._id,
        title: saveData.title,
        analysis: saveData.analysis,
        createdAt: saveData.createdAt,
        usdRate: saveData.usdRate,
      });
      loadHistory();
      notifications.show({ message: '分析完成', color: 'teal' });
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setStage('idle');
    }
  };

  const toggleHistoryItem = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    setExpandedDetail(null);
    try {
      const res = await fetch(`/api/portfolio/analyses/${id}`);
      if (res.ok) setExpandedDetail(await res.json());
    } catch { /* ignore */ }
  };

  const deleteAnalysis = (id: string) => {
    modals.openConfirmModal({
      title: '刪除這筆分析？',
      centered: true,
      children: <Text size="sm">刪除後無法復原。</Text>,
      labels: { confirm: '刪除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await fetch(`/api/portfolio/analyses?id=${id}`, { method: 'DELETE' });
          setHistory((prev) => prev.filter((h) => h._id !== id));
          if (current?._id === id) setCurrent(null);
          if (expandedId === id) {
            setExpandedId(null);
            setExpandedDetail(null);
          }
          notifications.show({ message: '已刪除', color: 'green' });
        } catch {
          notifications.show({ message: '刪除失敗', color: 'red' });
        }
      },
    });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      title={
        <Group gap="xs">
          <ThemeIcon color="indigo" variant="light" radius="md">
            <BrainCircuit size={18} />
          </ThemeIcon>
          <Title order={5}>組合分析</Title>
        </Group>
      }
    >
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Button
            color="indigo"
            leftSection={<RefreshCw size={16} />}
            loading={isAnalyzing}
            onClick={runAnalyze}
          >
            {current ? '重新分析' : '開始分析'}
          </Button>
          {current && (
            <Text size="xs" c="dimmed">
              最新：{formatTime(current.createdAt)}
            </Text>
          )}
        </Group>

        {error && (
          <Alert color="red" variant="light" py="xs">
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        {isAnalyzing && (
          <Paper p="md" radius="md" bg="var(--mantine-color-default-hover)">
            <Center>
              <Stack align="center" gap="xs" py="md">
                <Loader color="indigo" size="sm" />
                <Text size="sm" c="dimmed">{STAGE_LABEL[stage].title}</Text>
                <Text size="xs" c="dimmed">{STAGE_LABEL[stage].hint}</Text>
              </Stack>
            </Center>
          </Paper>
        )}

        {!isAnalyzing && current && (
          <Paper withBorder p="md" radius="md">
            <Typography>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.analysis}</ReactMarkdown>
            </Typography>
          </Paper>
        )}

        {!isAnalyzing && !current && !isLoading && (
          <Paper p="lg" radius="md" bg="var(--mantine-color-default-hover)">
            <Center>
              <Stack align="center" gap="xs">
                <ThemeIcon size={56} radius="xl" variant="light" color="indigo">
                  <BrainCircuit size={28} />
                </ThemeIcon>
                <Text c="dimmed">尚未有分析紀錄</Text>
                <Text c="dimmed" size="sm">點「開始分析」讓 AI 幫你看目前組合</Text>
              </Stack>
            </Center>
          </Paper>
        )}

        {history.length > 0 && (
          <div>
            <Group gap={6} mb="xs">
              <History size={14} color="var(--mantine-color-dimmed)" />
              <Text size="sm" fw={500} c="dimmed">
                歷史紀錄（{history.length} 筆）
              </Text>
            </Group>
            <Stack gap="xs">
              {history.map((item) => {
                const isExpanded = expandedId === item._id;
                return (
                  <Paper key={item._id} withBorder radius="md" p={0}>
                    <Group justify="space-between" p="sm" wrap="nowrap">
                      <UnstyledButton
                        onClick={() => toggleHistoryItem(item._id)}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <Group gap="xs" wrap="nowrap">
                          <ChevronDown
                            size={14}
                            style={{
                              color: 'var(--mantine-color-dimmed)',
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <Text size="sm" fw={500} truncate>{item.title}</Text>
                            <Text size="xs" c="dimmed">
                              {formatTime(item.createdAt)} · {item.holdingsCount} 檔
                            </Text>
                          </div>
                        </Group>
                      </UnstyledButton>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => deleteAnalysis(item._id)}
                        aria-label="刪除"
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    </Group>
                    {isExpanded && (
                      <ScrollArea.Autosize mah="50vh">
                        <Paper
                          p="md"
                          radius={0}
                          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                        >
                          {expandedDetail?._id === item._id ? (
                            <Typography>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {expandedDetail.analysis}
                              </ReactMarkdown>
                            </Typography>
                          ) : (
                            <Center py="md">
                              <Loader size="xs" color="indigo" />
                            </Center>
                          )}
                        </Paper>
                      </ScrollArea.Autosize>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </div>
        )}
      </Stack>
    </Drawer>
  );
}
