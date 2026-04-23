'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { Edit2, Trash2, TrendingUp, TrendingDown, GripVertical, ChevronDown, ArrowDownToLine, History } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatAmount, formatPercent, formatNumber, formatShares } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import StockPriceChart from '@/components/dashboard/StockPriceChart';
import StockAnalysis from '@/components/stocks/StockAnalysis';

interface StockTableProps {
  stocks: StockWithCalculations[];
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
  usdRate?: number;
  privacyMode?: boolean;
}

const MASK = '＊＊＊＊';

function TWDSub({ usd, rate }: { usd: number; rate: number }) {
  if (rate <= 0) return null;
  return (
    <Text component="span" display="block" size="10px" c="dimmed">
      ≈ NT$ {formatNumber(usd * rate, 0)}
    </Text>
  );
}

function MarketBadge({ market }: { market: 'TW' | 'US' }) {
  return (
    <Badge size="xs" variant="light" color={market === 'TW' ? 'blue' : 'violet'} radius="xl">
      {market}
    </Badge>
  );
}

function ActionButtons({
  stock, onEdit, onDelete, onSell, onViewHistory,
}: {
  stock: StockWithCalculations;
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
}) {
  return (
    <Group gap={2} wrap="nowrap" justify="flex-end">
      {stock.totalShares > 0 && (
        <ActionIcon variant="subtle" color="orange" onClick={() => onSell(stock)} aria-label="賣出">
          <ArrowDownToLine size={16} />
        </ActionIcon>
      )}
      {stock.sales && stock.sales.length > 0 && (
        <ActionIcon variant="subtle" color="teal" onClick={() => onViewHistory(stock)} aria-label="賣出歷史">
          <History size={16} />
        </ActionIcon>
      )}
      <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(stock)} aria-label="編輯">
        <Edit2 size={16} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="red"
        onClick={() => stock._id && onDelete(stock._id)}
        aria-label="刪除"
      >
        <Trash2 size={16} />
      </ActionIcon>
    </Group>
  );
}

/* ─── 手機版：卡片 ─── */
function SortableCard({
  stock, onEdit, onDelete, onSell, onViewHistory, usdRate, privacyMode, isExpanded, onToggleExpand,
}: {
  stock: StockWithCalculations;
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
  usdRate: number;
  privacyMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock._id! });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };
  const isProfit = (stock.totalProfit || 0) >= 0;
  const isUS = stock.market === 'US';
  const twdCost = isUS
    ? stock.purchases.reduce((sum, p) => sum + p.shares * p.price * (p.exchangeRate || usdRate), 0)
    : 0;

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
        <Group justify="space-between" mb="sm" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
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
            <MarketBadge market={stock.market} />
            <UnstyledButton onClick={onToggleExpand} style={{ minWidth: 0, flex: 1 }}>
              <Group gap={6} wrap="nowrap">
                <Text fw={700} truncate>{stock.symbol}</Text>
                <Text size="xs" c="dimmed" truncate>{stock.name}</Text>
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
          <ActionButtons
            stock={stock}
            onEdit={onEdit}
            onDelete={onDelete}
            onSell={onSell}
            onViewHistory={onViewHistory}
          />
        </Group>

        <Paper
          p="xs"
          radius="md"
          mb="sm"
          bg={
            isProfit
              ? 'var(--mantine-color-teal-light)'
              : 'var(--mantine-color-red-light)'
          }
        >
          {privacyMode ? (
            <Text size="sm" fw={500} c="dimmed">{MASK}</Text>
          ) : (
            <Group gap={6} wrap="nowrap">
              {isProfit ? <TrendingUp size={16} color="var(--mantine-color-teal-6)" /> : <TrendingDown size={16} color="var(--mantine-color-red-6)" />}
              <Text size="sm" fw={500} c={isProfit ? 'teal' : 'red'}>
                {stock.totalProfit !== undefined ? formatAmount(stock.totalProfit, stock.market) : '-'}
              </Text>
              <Text size="xs" c={isProfit ? 'teal' : 'red'}>
                ({formatPercent(stock.totalProfitPercent || 0)})
              </Text>
              {isUS && stock.totalProfit !== undefined && usdRate > 0 && (
                <Text size="10px" c="dimmed" ml="auto">
                  ≈ NT$ {formatNumber(stock.totalProfit * usdRate, 0)}
                </Text>
              )}
            </Group>
          )}
        </Paper>

        <SimpleGrid cols={3} spacing="xs" verticalSpacing="xs">
          <div>
            <Text size="xs" c="dimmed">目前價格</Text>
            <Text size="sm" fw={600}>
              {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
            </Text>
            {isUS && stock.currentPrice ? <TWDSub usd={stock.currentPrice} rate={usdRate} /> : null}
          </div>
          <div>
            <Text size="xs" c="dimmed">平均成本</Text>
            <Text size="sm" fw={600}>{formatCurrency(stock.averagePrice, stock.market)}</Text>
            {isUS ? <TWDSub usd={stock.averagePrice} rate={usdRate} /> : null}
          </div>
          <div>
            <Text size="xs" c="dimmed">股數</Text>
            <Text size="sm" fw={600}>{formatShares(stock.totalShares, stock.market)}</Text>
          </div>

          <div>
            <Text size="xs" c="dimmed">投入成本</Text>
            {privacyMode ? (
              <Text size="sm" fw={600} c="dimmed">{MASK}</Text>
            ) : (
              <>
                <Text size="sm" fw={600}>{formatAmount(stock.totalCost, stock.market)}</Text>
                {isUS && twdCost > 0 && (
                  <Text component="span" display="block" size="10px" c="dimmed">
                    ≈ NT$ {formatNumber(twdCost, 0)}
                  </Text>
                )}
              </>
            )}
          </div>
          <div>
            <Text size="xs" c="dimmed">目前市值</Text>
            {privacyMode ? (
              <Text size="sm" fw={600} c="dimmed">{MASK}</Text>
            ) : (
              <>
                <Text size="sm" fw={600}>
                  {stock.totalValue !== undefined ? formatAmount(stock.totalValue, stock.market) : '-'}
                </Text>
                {isUS && stock.totalValue !== undefined ? <TWDSub usd={stock.totalValue} rate={usdRate} /> : null}
              </>
            )}
          </div>
          <div>
            <Text size="xs" c="dimmed">未實現損益</Text>
            {privacyMode ? (
              <Text size="sm" fw={600} c="dimmed">{MASK}</Text>
            ) : (
              <Text size="sm" fw={600} c={isProfit ? 'teal' : 'red'}>
                {stock.totalProfit !== undefined ? formatAmount(stock.totalProfit, stock.market) : '-'}
              </Text>
            )}
          </div>
          {stock.realizedPL !== undefined && stock.realizedPL !== 0 && (
            <div>
              <Text size="xs" c="dimmed">已實現損益</Text>
              {privacyMode ? (
                <Text size="sm" fw={600} c="dimmed">{MASK}</Text>
              ) : (
                <Text size="sm" fw={600} c={stock.realizedPL >= 0 ? 'teal' : 'red'}>
                  {formatAmount(stock.realizedPL, stock.market)}
                </Text>
              )}
            </div>
          )}
        </SimpleGrid>
      </Box>

      {isExpanded && (
        <Box p="md" pt={0} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Stack gap="sm">
            <StockPriceChart symbol={stock.symbol} market={stock.market} currentPrice={stock.currentPrice} />
            <StockAnalysis
              symbol={stock.symbol}
              name={stock.name}
              market={stock.market}
              averagePrice={stock.averagePrice}
              totalShares={stock.totalShares}
              totalProfit={stock.totalProfit}
              totalProfitPercent={stock.totalProfitPercent}
              currentPrice={stock.currentPrice}
            />
          </Stack>
        </Box>
      )}
    </Card>
  );
}

/* ─── 桌面版：表格列 ─── */
function SortableRow({
  stock, onEdit, onDelete, onSell, onViewHistory, usdRate, privacyMode, isExpanded, onToggleExpand,
}: {
  stock: StockWithCalculations;
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
  usdRate: number;
  privacyMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock._id! });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };
  const isProfit = (stock.totalProfit || 0) >= 0;
  const isUS = stock.market === 'US';

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
              <MarketBadge market={stock.market} />
              <div>
                <Text fw={500} size="sm">{stock.symbol}</Text>
                <Text size="xs" c="dimmed">{stock.name}</Text>
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
            {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
          </Text>
          {isUS && stock.currentPrice ? <TWDSub usd={stock.currentPrice} rate={usdRate} /> : null}
        </Table.Td>
        <Table.Td ta="right">
          <Text fw={500} size="sm">{formatCurrency(stock.averagePrice, stock.market)}</Text>
          {isUS ? <TWDSub usd={stock.averagePrice} rate={usdRate} /> : null}
        </Table.Td>
        <Table.Td ta="right">
          <Text size="sm" c="dimmed">{formatShares(stock.totalShares, stock.market)}</Text>
        </Table.Td>
        <Table.Td ta="right">
          {privacyMode ? (
            <Text size="sm" c="dimmed">{MASK}</Text>
          ) : (
            <>
              <Text size="sm">{formatAmount(stock.totalCost, stock.market)}</Text>
              {isUS && (() => {
                const twdCost = stock.purchases.reduce(
                  (sum, p) => sum + p.shares * p.price * (p.exchangeRate || usdRate),
                  0,
                );
                return twdCost > 0 ? (
                  <Text component="span" display="block" size="10px" c="dimmed">
                    ≈ NT$ {formatNumber(twdCost, 0)}
                  </Text>
                ) : null;
              })()}
            </>
          )}
        </Table.Td>
        <Table.Td ta="right">
          {privacyMode ? (
            <Text size="sm" c="dimmed">{MASK}</Text>
          ) : (
            <>
              <Text size="sm">
                {stock.totalValue !== undefined ? formatAmount(stock.totalValue, stock.market) : '-'}
              </Text>
              {isUS && stock.totalValue !== undefined ? <TWDSub usd={stock.totalValue} rate={usdRate} /> : null}
            </>
          )}
        </Table.Td>
        <Table.Td ta="right">
          {privacyMode ? (
            <Text size="sm" c="dimmed">{MASK}</Text>
          ) : (
            <>
              <Group gap={4} justify="flex-end" wrap="nowrap">
                {isProfit
                  ? <TrendingUp size={14} color="var(--mantine-color-teal-6)" />
                  : <TrendingDown size={14} color="var(--mantine-color-red-6)" />
                }
                <Text size="sm" fw={500} c={isProfit ? 'teal' : 'red'}>
                  {stock.totalProfit !== undefined ? formatAmount(stock.totalProfit, stock.market) : '-'}
                </Text>
                <Text size="xs" c={isProfit ? 'teal' : 'red'}>
                  ({formatPercent(stock.totalProfitPercent || 0)})
                </Text>
              </Group>
              {isUS && stock.totalProfit !== undefined ? <TWDSub usd={stock.totalProfit} rate={usdRate} /> : null}
              {stock.realizedPL !== undefined && stock.realizedPL !== 0 && (
                <Text size="10px" c={stock.realizedPL >= 0 ? 'teal' : 'red'}>
                  已實現 {formatAmount(stock.realizedPL, stock.market)}
                </Text>
              )}
            </>
          )}
        </Table.Td>
        <Table.Td ta="right">
          <ActionButtons
            stock={stock}
            onEdit={onEdit}
            onDelete={onDelete}
            onSell={onSell}
            onViewHistory={onViewHistory}
          />
        </Table.Td>
      </Table.Tr>
      {isExpanded && (
        <Table.Tr>
          <Table.Td colSpan={9} p="md" pt={0}>
            <Stack gap="sm">
              <StockPriceChart symbol={stock.symbol} market={stock.market} currentPrice={stock.currentPrice} />
              <StockAnalysis
                symbol={stock.symbol}
                name={stock.name}
                market={stock.market}
                averagePrice={stock.averagePrice}
                totalShares={stock.totalShares}
                totalProfit={stock.totalProfit}
                totalProfitPercent={stock.totalProfitPercent}
                currentPrice={stock.currentPrice}
              />
            </Stack>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

export default function StockTable({
  stocks, onEdit, onDelete, onSell, onViewHistory, usdRate = 0, privacyMode = false,
}: StockTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (stocks.length === 0) {
    return (
      <Card withBorder radius="lg" p="xl">
        <Center>
          <Stack gap={4} align="center">
            <Text c="dimmed" size="lg">尚未新增任何持股</Text>
            <Text c="dimmed" size="sm">點擊「新增持股」開始記錄你的投資組合</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  const sortableIds = stocks.map((s) => s._id!);

  return (
    <>
      {/* 手機版：卡片列表 */}
      <Stack gap="sm" hiddenFrom="lg">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {stocks.map((stock) => (
            <SortableCard
              key={stock._id}
              stock={stock}
              onEdit={onEdit}
              onDelete={onDelete}
              onSell={onSell}
              onViewHistory={onViewHistory}
              usdRate={usdRate}
              privacyMode={privacyMode}
              isExpanded={expandedId === stock._id}
              onToggleExpand={() => toggleExpand(stock._id!)}
            />
          ))}
        </SortableContext>
      </Stack>

      {/* 桌面版：表格 */}
      <Card withBorder radius="lg" p={0} visibleFrom="lg">
        <ScrollArea>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 32 }} />
                <Table.Th>股票</Table.Th>
                <Table.Th ta="right">目前價格</Table.Th>
                <Table.Th ta="right">平均成本</Table.Th>
                <Table.Th ta="right">股數</Table.Th>
                <Table.Th ta="right">投入成本</Table.Th>
                <Table.Th ta="right">目前市值</Table.Th>
                <Table.Th ta="right">損益</Table.Th>
                <Table.Th ta="right">操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <Table.Tbody>
                {stocks.map((stock) => (
                  <SortableRow
                    key={stock._id}
                    stock={stock}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSell={onSell}
                    onViewHistory={onViewHistory}
                    usdRate={usdRate}
                    privacyMode={privacyMode}
                    isExpanded={expandedId === stock._id}
                    onToggleExpand={() => toggleExpand(stock._id!)}
                  />
                ))}
              </Table.Tbody>
            </SortableContext>
          </Table>
        </ScrollArea>
      </Card>
    </>
  );
}
