'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActionIcon,
  Card,
  Group,
  Loader,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { RefreshCw } from 'lucide-react';

interface IndexQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min

function formatPrice(p: number | null): string {
  if (p === null) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return p.toFixed(2);
}

function formatChange(c: number | null): string {
  if (c === null) return '—';
  const sign = c >= 0 ? '+' : '';
  return `${sign}${c.toFixed(2)}`;
}

function formatPercent(p: number | null): string {
  if (p === null) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
}

export default function MarketIndicesPanel() {
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/indices');
      if (!res.ok) {
        setError('讀取失敗');
        return;
      }
      const data = await res.json();
      setIndices(data.indices || []);
      setFetchedAt(data.fetchedAt);
    } catch {
      setError('網路錯誤');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card withBorder radius="md" p="xs">
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text size="xs" c="dimmed" fw={500}>市場指數</Text>
        <Group gap={6}>
          {fetchedAt && (
            <Text size="10px" c="dimmed">
              更新：{formatTime(fetchedAt)}
            </Text>
          )}
          <Tooltip label="重新整理（每 5 分鐘自動更新）" withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => load(true)}
              loading={isRefreshing}
              aria-label="重新整理"
            >
              <RefreshCw size={12} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {error && (
        <Text size="xs" c="red">{error}</Text>
      )}

      <ScrollArea scrollbarSize={4} type="auto" offsetScrollbars="x">
        <Group gap="md" wrap="nowrap" pb={4}>
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Stack key={i} gap={2} style={{ minWidth: 110, flexShrink: 0 }}>
                  <Skeleton height={10} width={60} />
                  <Skeleton height={16} width={80} />
                  <Skeleton height={10} width={70} />
                </Stack>
              ))
            : indices.map((idx) => {
                const isUp = (idx.change || 0) > 0;
                const isDown = (idx.change || 0) < 0;
                const color = isUp ? 'red.6' : isDown ? 'teal.6' : 'gray.6';
                return (
                  <Stack
                    key={idx.symbol}
                    gap={0}
                    style={{ minWidth: 110, flexShrink: 0 }}
                  >
                    <Text size="10px" c="dimmed">{idx.name}</Text>
                    <Text size="md" fw={700}>{formatPrice(idx.price)}</Text>
                    <Group gap={4} wrap="nowrap">
                      <Text size="10px" c={color} fw={500}>
                        {formatChange(idx.change)}
                      </Text>
                      <Text size="10px" c={color}>
                        ({formatPercent(idx.changePercent)})
                      </Text>
                    </Group>
                  </Stack>
                );
              })}
        </Group>
      </ScrollArea>
    </Card>
  );
}
