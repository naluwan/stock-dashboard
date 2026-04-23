'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3,
  DollarSign,
  Clock,
  Star,
  History,
  Trash2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Market, PriceData } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import StockPriceChart from '@/components/dashboard/StockPriceChart';

interface SearchResult {
  symbol: string;
  name: string;
  market: Market;
}

interface HistoryItem {
  symbol: string;
  name: string;
  market: Market;
  searchedAt: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<Market>('TW');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<PriceData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [favoriteSymbols, setFavoriteSymbols] = useState<Set<string>>(new Set());

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/search-history');
      if (res.ok) setSearchHistory(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavoriteSymbols(new Set(data.map((f: SearchResult) => `${f.market}_${f.symbol}`)));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, [loadHistory, loadFavorites]);

  const saveSearchHistory = async (symbol: string, name: string, stockMarket: Market) => {
    try {
      await fetch('/api/search-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, name, market: stockMarket }),
      });
      loadHistory();
    } catch { /* ignore */ }
  };

  const toggleFavorite = async (symbol: string, name: string, stockMarket: Market) => {
    const key = `${stockMarket}_${symbol}`;
    const isFav = favoriteSymbols.has(key);

    try {
      if (isFav) {
        await fetch(`/api/favorites?symbol=${encodeURIComponent(symbol)}&market=${stockMarket}`, { method: 'DELETE' });
        setFavoriteSymbols((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, name, market: stockMarket }),
        });
        setFavoriteSymbols((prev) => new Set(prev).add(key));
      }
    } catch { /* ignore */ }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/search-history', { method: 'DELETE' });
      setSearchHistory([]);
    } catch { /* ignore */ }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSelectedQuote(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&market=${market}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetQuote = async (symbol: string, stockMarket: Market, name?: string) => {
    setIsLoadingQuote(true);
    setQuoteError(null);
    setSelectedQuote(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(symbol)}&market=${stockMarket}&action=quote`);
      if (res.ok) {
        const data: PriceData = await res.json();
        setSelectedQuote(data);
        saveSearchHistory(data.symbol, data.name || name || symbol, data.market);
      } else {
        setQuoteError(`無法取得 ${symbol} 的報價資料，請稍後再試`);
      }
    } catch (error) {
      console.error('Quote fetch failed:', error);
      setQuoteError(`取得報價時發生錯誤，請稍後再試`);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const isPositive = (selectedQuote?.change || 0) >= 0;
  const isFavorited = selectedQuote
    ? favoriteSymbols.has(`${selectedQuote.market}_${selectedQuote.symbol}`)
    : false;

  return (
    <div>
      <Header title="股票搜尋" subtitle="查詢即時股價和相關資訊" />

      <Stack p={{ base: 'md', sm: 'xl' }} gap="md">
        <Card withBorder radius="lg" p="md">
          <Stack gap="sm">
            <SegmentedControl
              value={market}
              onChange={(v) => {
                setMarket(v as Market);
                setSearchResults([]);
                setSelectedQuote(null);
              }}
              data={[
                { value: 'TW', label: '🇹🇼 台股' },
                { value: 'US', label: '🇺🇸 美股' },
              ]}
            />

            <Group gap="xs" wrap="nowrap">
              <TextInput
                flex={1}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={market === 'TW' ? '輸入股票代碼，例如 2330' : '輸入代碼或名稱，例如 AAPL'}
                leftSection={<Search size={16} />}
              />
              <Button
                color="teal"
                leftSection={<Search size={16} />}
                loading={isSearching}
                disabled={!query.trim()}
                onClick={handleSearch}
              >
                搜尋
              </Button>
            </Group>
          </Stack>
        </Card>

        {searchHistory.length > 0 && !selectedQuote && searchResults.length === 0 && (
          <Card withBorder radius="lg" p={0}>
            <Group
              justify="space-between"
              p="md"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Group gap={6}>
                <History size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" fw={500} c="dimmed">最近搜尋</Text>
              </Group>
              <Button
                variant="subtle"
                color="red"
                size="compact-xs"
                leftSection={<Trash2 size={12} />}
                onClick={clearHistory}
              >
                清除
              </Button>
            </Group>
            <Group p="md" gap="xs">
              {searchHistory.map((item) => (
                <UnstyledButton
                  key={`${item.market}_${item.symbol}`}
                  onClick={() => {
                    setMarket(item.market);
                    handleGetQuote(item.symbol, item.market, item.name);
                  }}
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 'var(--mantine-radius-md)',
                    padding: '6px 10px',
                  }}
                >
                  <Group gap={6} wrap="nowrap">
                    <Badge size="xs" color={item.market === 'TW' ? 'blue' : 'violet'} variant="light">
                      {item.market}
                    </Badge>
                    <Text size="sm" fw={500}>{item.symbol}</Text>
                    <Text size="xs" c="dimmed">{item.name}</Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Group>
          </Card>
        )}

        {searchResults.length > 0 && (
          <Card withBorder radius="lg" p={0}>
            <Text
              size="sm"
              fw={500}
              c="dimmed"
              p="md"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              搜尋結果 ({searchResults.length})
            </Text>
            <Stack gap={0}>
              {searchResults.map((result, idx) => (
                <UnstyledButton
                  key={`${result.market}_${result.symbol}`}
                  onClick={() => handleGetQuote(result.symbol, result.market, result.name)}
                  p="md"
                  style={{
                    borderTop: idx === 0 ? 'none' : '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Badge color={result.market === 'TW' ? 'blue' : 'violet'} variant="light">
                        {result.market === 'TW' ? '台股' : '美股'}
                      </Badge>
                      <div>
                        <Text fw={500}>{result.symbol}</Text>
                        <Text size="sm" c="dimmed">{result.name}</Text>
                      </div>
                    </Group>
                    <ArrowRight size={16} color="var(--mantine-color-dimmed)" />
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </Card>
        )}

        {isLoadingQuote && (
          <Center py="xl">
            <Loader color="teal" />
          </Center>
        )}

        {quoteError && !isLoadingQuote && (
          <Alert color="red" variant="light">{quoteError}</Alert>
        )}

        {selectedQuote && !isLoadingQuote && (
          <Stack gap="md">
            <Card withBorder radius="lg" p="md">
              <Group justify="space-between" wrap="wrap" align="flex-start">
                <Stack gap={2}>
                  <Group gap="sm" wrap="nowrap">
                    <Badge color={selectedQuote.market === 'TW' ? 'blue' : 'violet'} variant="light">
                      {selectedQuote.market === 'TW' ? '台股' : '美股'}
                    </Badge>
                    <Title order={3}>{selectedQuote.symbol}</Title>
                    <ActionIcon
                      variant="subtle"
                      color={isFavorited ? 'yellow' : 'gray'}
                      onClick={() =>
                        toggleFavorite(selectedQuote.symbol, selectedQuote.name, selectedQuote.market)
                      }
                      aria-label={isFavorited ? '移除自選' : '加入自選'}
                    >
                      <Star size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                    </ActionIcon>
                  </Group>
                  <Text size="sm" c="dimmed">{selectedQuote.name}</Text>
                </Stack>
                <Stack gap={2} align="flex-end">
                  <Title order={2}>{formatCurrency(selectedQuote.currentPrice, selectedQuote.market)}</Title>
                  <Group gap={4} c={isPositive ? 'teal' : 'red'}>
                    {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    <Text fw={500}>
                      {isPositive ? '+' : ''}
                      {selectedQuote.change.toFixed(2)} ({formatPercent(selectedQuote.changePercent)})
                    </Text>
                  </Group>
                </Stack>
              </Group>
            </Card>

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              {[
                { label: '前日收盤', value: formatCurrency(selectedQuote.previousClose, selectedQuote.market), icon: DollarSign },
                { label: '今日最高', value: formatCurrency(selectedQuote.high, selectedQuote.market), icon: TrendingUp },
                { label: '今日最低', value: formatCurrency(selectedQuote.low, selectedQuote.market), icon: TrendingDown },
                { label: '成交量', value: formatNumber(selectedQuote.volume, 0), icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label} withBorder radius="lg" p="sm">
                    <Group gap={6} c="dimmed">
                      <Icon size={14} />
                      <Text size="xs">{item.label}</Text>
                    </Group>
                    <Text size="lg" fw={700} mt={4}>{item.value}</Text>
                  </Card>
                );
              })}
            </SimpleGrid>

            <StockPriceChart
              symbol={selectedQuote.symbol}
              market={selectedQuote.market}
              currentPrice={selectedQuote.currentPrice}
            />

            <Group justify="center" gap={6}>
              <Clock size={12} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed">
                最後更新: {new Date(selectedQuote.updatedAt).toLocaleString('zh-TW')}
              </Text>
            </Group>
          </Stack>
        )}

        {!isSearching && searchResults.length === 0 && query && !selectedQuote && (
          <Card withBorder radius="lg" p="xl">
            <Center>
              <Stack align="center" gap={4}>
                <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                  <Search size={28} />
                </ThemeIcon>
                <Text c="dimmed" size="lg">找不到相關股票</Text>
                <Text c="dimmed" size="sm">請確認代碼是否正確，或切換市場再試試</Text>
              </Stack>
            </Center>
          </Card>
        )}
      </Stack>
    </div>
  );
}
