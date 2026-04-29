'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Star,
  History,
  Trash2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { IStock, Market, PriceData } from '@/types';
import { enrichStockWithCalculations, formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import StockPriceChart from '@/components/dashboard/StockPriceChart';
import StockAnalysis from '@/components/stocks/StockAnalysis';
import StockFundamentals from '@/components/stocks/StockFundamentals';
import MarketIndicesPanel from '@/components/dashboard/MarketIndicesPanel';

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
  return (
    <Suspense fallback={<Center h="100vh"><Loader color="teal" /></Center>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<Market>('TW');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<PriceData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [favoriteSymbols, setFavoriteSymbols] = useState<Set<string>>(new Set());
  const [ownedMap, setOwnedMap] = useState<Map<string, IStock>>(new Map());

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

  const loadOwnedStocks = useCallback(async () => {
    try {
      const res = await fetch('/api/stocks');
      if (res.ok) {
        const data: IStock[] = await res.json();
        const map = new Map<string, IStock>();
        data.forEach((s) => map.set(`${s.market}_${s.symbol}`, s));
        setOwnedMap(map);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadHistory();
    loadFavorites();
    loadOwnedStocks();
  }, [loadHistory, loadFavorites, loadOwnedStocks]);

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

  const handleGetQuote = useCallback(async (symbol: string, stockMarket: Market, name?: string) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 從 URL query param 自動帶股
  const searchParams = useSearchParams();
  useEffect(() => {
    const sym = searchParams.get('symbol');
    const mkt = searchParams.get('market') as Market | null;
    if (sym && (mkt === 'TW' || mkt === 'US')) {
      setMarket(mkt);
      handleGetQuote(sym, mkt);
    }
  }, [searchParams, handleGetQuote]);

  const isPositive = (selectedQuote?.change || 0) >= 0;
  const isFavorited = selectedQuote
    ? favoriteSymbols.has(`${selectedQuote.market}_${selectedQuote.symbol}`)
    : false;

  return (
    <div>
      <Header title="股票搜尋" subtitle="查詢即時股價和相關資訊" />

      <Stack p={{ base: 'md', sm: 'xl' }} gap="md">
        <MarketIndicesPanel />

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
            {/* Hero: 大字現價 */}
            <Card
              withBorder
              radius="md"
              p={0}
              style={{ overflow: 'hidden' }}
            >
              <Group
                justify="space-between"
                wrap="wrap"
                align="flex-end"
                gap="md"
                p={{ base: 'md', sm: 'lg' }}
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-default-hover) 0%, transparent 100%)',
                }}
              >
                <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Badge size="sm" color={selectedQuote.market === 'TW' ? 'blue' : 'violet'} variant="light">
                      {selectedQuote.market === 'TW' ? '台股' : '美股'}
                    </Badge>
                    <Text fw={700} size="xl" tt="uppercase" style={{ letterSpacing: 1 }}>
                      {selectedQuote.symbol}
                    </Text>
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
                  <Text size="sm" c="dimmed" truncate>{selectedQuote.name}</Text>
                </Stack>
                <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                  <Text fz={{ base: 32, sm: 40 }} fw={800} lh={1}>
                    {formatCurrency(selectedQuote.currentPrice, selectedQuote.market)}
                  </Text>
                  <Group gap={6} c={isPositive ? 'red.6' : 'teal.6'}>
                    {isPositive
                      ? <TrendingUp size={18} />
                      : <TrendingDown size={18} />}
                    <Text fw={600} size="md">
                      {isPositive ? '+' : ''}
                      {selectedQuote.change.toFixed(2)}
                    </Text>
                    <Text fw={600} size="md">
                      ({formatPercent(selectedQuote.changePercent)})
                    </Text>
                  </Group>
                </Stack>
              </Group>

              {/* 統計列 */}
              <SimpleGrid
                cols={{ base: 2, xs: 3, sm: 6 }}
                spacing={0}
                style={{
                  borderTop: '1px solid var(--mantine-color-default-border)',
                }}
              >
                {[
                  { label: '前日收盤', value: formatCurrency(selectedQuote.previousClose, selectedQuote.market) },
                  { label: '今日開盤', value: formatCurrency(selectedQuote.previousClose, selectedQuote.market) },
                  { label: '今日最高', value: formatCurrency(selectedQuote.high, selectedQuote.market) },
                  { label: '今日最低', value: formatCurrency(selectedQuote.low, selectedQuote.market) },
                  { label: '成交量', value: formatNumber(selectedQuote.volume, 0) },
                  { label: '更新時間', value: new Date(selectedQuote.updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) },
                ].map((item, i, arr) => (
                  <Stack
                    key={item.label}
                    gap={2}
                    px="md"
                    py="sm"
                    style={{
                      borderRight:
                        i < arr.length - 1
                          ? '1px solid var(--mantine-color-default-border)'
                          : 'none',
                    }}
                  >
                    <Text size="10px" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                      {item.label}
                    </Text>
                    <Text size="sm" fw={600} truncate>{item.value}</Text>
                  </Stack>
                ))}
              </SimpleGrid>
            </Card>

            <StockPriceChart
              symbol={selectedQuote.symbol}
              market={selectedQuote.market}
              currentPrice={selectedQuote.currentPrice}
            />

            <StockFundamentals
              symbol={selectedQuote.symbol}
              market={selectedQuote.market}
            />

            {(() => {
              const owned = ownedMap.get(`${selectedQuote.market}_${selectedQuote.symbol}`);
              const enriched = owned
                ? enrichStockWithCalculations(owned, selectedQuote.currentPrice)
                : null;
              return (
                <StockAnalysis
                  symbol={selectedQuote.symbol}
                  name={selectedQuote.name}
                  market={selectedQuote.market}
                  currentPrice={selectedQuote.currentPrice}
                  averagePrice={enriched?.averagePrice}
                  totalShares={enriched?.totalShares}
                  totalProfit={enriched?.totalProfit}
                  totalProfitPercent={enriched?.totalProfitPercent}
                />
              );
            })()}

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
