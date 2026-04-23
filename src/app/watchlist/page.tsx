'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
  Collapse,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  GripVertical,
  ChevronDown,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Header from '@/components/layout/Header';
import StockPriceChart from '@/components/dashboard/StockPriceChart';
import StockAnalysis from '@/components/stocks/StockAnalysis';
import { IStock, Market, PriceData, StockWithCalculations } from '@/types';
import { enrichStockWithCalculations, formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

interface FavoriteItem {
  _id: string;
  symbol: string;
  name: string;
  market: Market;
  addedAt: string;
  sortOrder?: number;
}

interface FavoriteWithPrice extends FavoriteItem {
  price?: PriceData;
}

function MarketBadge({ market }: { market: Market }) {
  return (
    <Badge size="xs" variant="light" color={market === 'TW' ? 'blue' : 'violet'}>
      {market}
    </Badge>
  );
}

/* ─── Sortable Card (手機版) ─── */
function SortableCard({
  item, usdRate, onRemove, isExpanded, onToggleExpand, ownedStock,
}: {
  item: FavoriteWithPrice;
  usdRate: number;
  onRemove: (symbol: string, market: Market) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  ownedStock: StockWithCalculations | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };
  const price = item.price;
  const isUp = (price?.change || 0) >= 0;
  const isUS = item.market === 'US';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      withBorder
      radius="lg"
      p={0}
      shadow={isDragging ? 'md' : undefined}
    >
      <Box p="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <ActionIcon
              {...attributes}
              {...listeners}
              variant="transparent"
              color="gray"
              size="sm"
              style={{ cursor: 'grab', touchAction: 'none' }}
              aria-label="拖拉排序"
            >
              <GripVertical size={14} />
            </ActionIcon>
            <MarketBadge market={item.market} />
            <UnstyledButton onClick={onToggleExpand} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={4} wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text fw={500} truncate>{item.symbol}</Text>
                  <Text size="xs" c="dimmed" truncate>{item.name}</Text>
                </div>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--mantine-color-dimmed)',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
                />
              </Group>
            </UnstyledButton>
          </Group>
          <ActionIcon
            variant="subtle"
            color="yellow"
            onClick={() => onRemove(item.symbol, item.market)}
            aria-label="移除自選"
          >
            <Star size={16} fill="currentColor" />
          </ActionIcon>
        </Group>

        {price && (
          <SimpleGrid cols={3} spacing="xs" mt="sm">
            <div>
              <Text size="11px" c="dimmed">現價</Text>
              <Text fw={600}>{formatCurrency(price.currentPrice, item.market)}</Text>
              {isUS && usdRate > 0 && (
                <Text size="10px" c="dimmed">
                  ≈ NT$ {formatNumber(price.currentPrice * usdRate, 0)}
                </Text>
              )}
            </div>
            <div>
              <Text size="11px" c="dimmed">漲跌</Text>
              <Text fw={600} c={isUp ? 'teal' : 'red'}>
                {isUp ? '+' : ''}{price.change.toFixed(2)}
              </Text>
            </div>
            <div>
              <Text size="11px" c="dimmed">漲跌幅</Text>
              <Text fw={600} c={isUp ? 'teal' : 'red'}>
                {formatPercent(price.changePercent)}
              </Text>
            </div>
          </SimpleGrid>
        )}
      </Box>

      <Collapse expanded={isExpanded}>
        <Box p="md" pt={0} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Stack gap="sm">
            <StockPriceChart symbol={item.symbol} market={item.market} currentPrice={price?.currentPrice} />
            <StockAnalysis
              symbol={item.symbol}
              name={item.name}
              market={item.market}
              currentPrice={price?.currentPrice}
              averagePrice={ownedStock?.averagePrice}
              totalShares={ownedStock?.totalShares}
              totalProfit={ownedStock?.totalProfit}
              totalProfitPercent={ownedStock?.totalProfitPercent}
            />
          </Stack>
        </Box>
      </Collapse>
    </Card>
  );
}

/* ─── Sortable Table Row (桌面版) ─── */
function SortableTableRow({
  item, usdRate, onRemove, isExpanded, onToggleExpand, ownedStock,
}: {
  item: FavoriteWithPrice;
  usdRate: number;
  onRemove: (symbol: string, market: Market) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  ownedStock: StockWithCalculations | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };
  const price = item.price;
  const isUp = (price?.change || 0) >= 0;
  const isUS = item.market === 'US';

  return (
    <>
      <Table.Tr ref={setNodeRef} style={style} bg={isDragging ? 'var(--mantine-color-teal-light)' : undefined}>
        <Table.Td style={{ width: 32 }}>
          <ActionIcon
            {...attributes}
            {...listeners}
            variant="transparent"
            color="gray"
            size="sm"
            style={{ cursor: 'grab', touchAction: 'none' }}
            aria-label="拖拉排序"
          >
            <GripVertical size={14} />
          </ActionIcon>
        </Table.Td>
        <Table.Td>
          <UnstyledButton onClick={onToggleExpand}>
            <Group gap="xs" wrap="nowrap">
              <MarketBadge market={item.market} />
              <div>
                <Text fw={500} size="sm">{item.symbol}</Text>
                <Text size="xs" c="dimmed">{item.name}</Text>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--mantine-color-dimmed)',
                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </Group>
          </UnstyledButton>
        </Table.Td>
        <Table.Td ta="right">
          <Text fw={500} size="sm">
            {price ? formatCurrency(price.currentPrice, item.market) : '—'}
          </Text>
          {isUS && price && usdRate > 0 && (
            <Text size="10px" c="dimmed">
              ≈ NT$ {formatNumber(price.currentPrice * usdRate, 2)}
            </Text>
          )}
        </Table.Td>
        <Table.Td ta="right">
          {price ? (
            <Group justify="flex-end" gap={4} c={isUp ? 'teal' : 'red'}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <Text fw={500} size="sm">{isUp ? '+' : ''}{price.change.toFixed(2)}</Text>
            </Group>
          ) : '—'}
        </Table.Td>
        <Table.Td ta="right">
          <Text fw={500} size="sm" c={isUp ? 'teal' : 'red'}>
            {price ? `${isUp ? '+' : ''}${formatPercent(price.changePercent)}` : '—'}
          </Text>
        </Table.Td>
        <Table.Td ta="right">
          <Text size="sm" c="dimmed">
            {price ? formatCurrency(price.high, item.market) : '—'}
          </Text>
        </Table.Td>
        <Table.Td ta="right">
          <Text size="sm" c="dimmed">
            {price ? formatCurrency(price.low, item.market) : '—'}
          </Text>
        </Table.Td>
        <Table.Td ta="center">
          <ActionIcon
            variant="subtle"
            color="yellow"
            onClick={() => onRemove(item.symbol, item.market)}
            aria-label="移除自選"
          >
            <Star size={16} fill="currentColor" />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
      {isExpanded && (
        <Table.Tr>
          <Table.Td colSpan={8} p="md" pt={0}>
            <Stack gap="sm">
              <StockPriceChart symbol={item.symbol} market={item.market} currentPrice={price?.currentPrice} />
              <StockAnalysis
                symbol={item.symbol}
                name={item.name}
                market={item.market}
                currentPrice={price?.currentPrice}
                averagePrice={ownedStock?.averagePrice}
                totalShares={ownedStock?.totalShares}
                totalProfit={ownedStock?.totalProfit}
                totalProfitPercent={ownedStock?.totalProfitPercent}
              />
            </Stack>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

/* ─── Main Page ─── */
export default function WatchlistPage() {
  const [favorites, setFavorites] = useState<FavoriteWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usdRate, setUsdRate] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ownedMap, setOwnedMap] = useState<Map<string, IStock>>(new Map());

  const getOwnedStock = useCallback(
    (symbol: string, market: Market, currentPrice?: number): StockWithCalculations | null => {
      const owned = ownedMap.get(`${market}_${symbol}`);
      return owned ? enrichStockWithCalculations(owned, currentPrice) : null;
    },
    [ownedMap],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const fetchPrices = async (items: FavoriteItem[]) => {
    setIsRefreshing(true);
    const updated: FavoriteWithPrice[] = [...items];

    const promises = items.map(async (item, index) => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(item.symbol)}&market=${item.market}&action=quote`,
        );
        if (res.ok) {
          const price: PriceData = await res.json();
          updated[index] = { ...updated[index], price };
        }
      } catch { /* ignore */ }
    });

    await Promise.all(promises);
    setFavorites([...updated]);
    setIsRefreshing(false);
  };

  const loadFavorites = useCallback(async () => {
    try {
      const [res, rateRes, stocksRes] = await Promise.all([
        fetch('/api/favorites'),
        fetch('/api/exchange-rate'),
        fetch('/api/stocks'),
      ]);

      try {
        const rateData = await rateRes.json();
        setUsdRate(rateData.rate || 0);
      } catch { /* ignore */ }

      try {
        if (stocksRes.ok) {
          const stocksData: IStock[] = await stocksRes.json();
          const map = new Map<string, IStock>();
          stocksData.forEach((s) => map.set(`${s.market}_${s.symbol}`, s));
          setOwnedMap(map);
        }
      } catch { /* ignore */ }

      if (res.ok) {
        const data: FavoriteItem[] = await res.json();
        setFavorites(data.map((f) => ({ ...f })));
        fetchPrices(data);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const removeFavorite = async (symbol: string, market: Market) => {
    try {
      await fetch(`/api/favorites?symbol=${encodeURIComponent(symbol)}&market=${market}`, { method: 'DELETE' });
      setFavorites((prev) => prev.filter((f) => !(f.symbol === symbol && f.market === market)));
    } catch { /* ignore */ }
  };

  const handleRefresh = () => {
    fetchPrices(favorites);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = favorites.findIndex((f) => f._id === active.id);
    const newIndex = favorites.findIndex((f) => f._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(favorites, oldIndex, newIndex);
    setFavorites(reordered);

    try {
      const orderedIds = reordered.map((f) => f._id);
      await fetch('/api/favorites/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (error) {
      console.error('Failed to save order:', error);
      setFavorites(arrayMove(reordered, newIndex, oldIndex));
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="自選股票" subtitle="追蹤你關注的股票" />
        <Center py={96}>
          <Loader color="teal" />
        </Center>
      </div>
    );
  }

  const sortableIds = favorites.map((f) => f._id);

  return (
    <div>
      <Header
        title="自選股票"
        subtitle={`共 ${favorites.length} 檔自選股票`}
        onRefresh={handleRefresh}
      />

      <Stack p={{ base: 'md', sm: 'xl' }} gap="md">
        {usdRate > 0 && (
          <Group gap={4}>
            <DollarSign size={12} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">USD/TWD = {usdRate.toFixed(2)}</Text>
          </Group>
        )}

        {favorites.length === 0 ? (
          <Card withBorder radius="lg" p="xl">
            <Center>
              <Stack align="center" gap={4}>
                <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                  <Star size={28} />
                </ThemeIcon>
                <Text c="dimmed" size="lg">尚無自選股票</Text>
                <Text c="dimmed" size="sm">在股票搜尋頁面點擊星號即可加入自選</Text>
              </Stack>
            </Center>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Stack gap="sm">
              {isRefreshing && (
                <Group justify="center" gap={6}>
                  <RefreshCw size={14} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">正在更新報價...</Text>
                </Group>
              )}

              {/* 手機版：卡片 */}
              <Stack gap="sm" hiddenFrom="md">
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {favorites.map((item) => (
                    <SortableCard
                      key={item._id}
                      item={item}
                      usdRate={usdRate}
                      onRemove={removeFavorite}
                      isExpanded={expandedId === item._id}
                      onToggleExpand={() => toggleExpand(item._id)}
                      ownedStock={getOwnedStock(item.symbol, item.market, item.price?.currentPrice)}
                    />
                  ))}
                </SortableContext>
              </Stack>

              {/* 桌面版：表格 */}
              <Card withBorder radius="lg" p={0} visibleFrom="md">
                <ScrollArea>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 32 }} />
                        <Table.Th>股票</Table.Th>
                        <Table.Th ta="right">現價</Table.Th>
                        <Table.Th ta="right">漲跌</Table.Th>
                        <Table.Th ta="right">漲跌幅</Table.Th>
                        <Table.Th ta="right">最高</Table.Th>
                        <Table.Th ta="right">最低</Table.Th>
                        <Table.Th ta="center">操作</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                      <Table.Tbody>
                        {favorites.map((item) => (
                          <SortableTableRow
                            key={item._id}
                            item={item}
                            usdRate={usdRate}
                            onRemove={removeFavorite}
                            isExpanded={expandedId === item._id}
                            onToggleExpand={() => toggleExpand(item._id)}
                            ownedStock={getOwnedStock(item.symbol, item.market, item.price?.currentPrice)}
                          />
                        ))}
                      </Table.Tbody>
                    </SortableContext>
                  </Table>
                </ScrollArea>
              </Card>
            </Stack>
          </DndContext>
        )}
      </Stack>
    </div>
  );
}
