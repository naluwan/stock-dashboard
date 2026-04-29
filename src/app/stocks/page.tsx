'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Center, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Header from '@/components/layout/Header';
import StockTable from '@/components/stocks/StockTable';
import AddStockForm from '@/components/stocks/AddStockForm';
import SellStockForm from '@/components/stocks/SellStockForm';
import SellHistoryList from '@/components/stocks/SellHistoryList';
import MarketIndicesPanel from '@/components/dashboard/MarketIndicesPanel';
import { StockWithCalculations, IStock, Market, Purchase } from '@/types';
import { enrichStockWithCalculations } from '@/lib/utils';
import { Plus, DollarSign, Eye, EyeOff } from 'lucide-react';
import { confirmToast } from '@/lib/confirmToast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockWithCalculations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStock, setEditingStock] = useState<StockWithCalculations | null>(null);
  const [sellingStock, setSellingStock] = useState<StockWithCalculations | null>(null);
  const [historyStock, setHistoryStock] = useState<StockWithCalculations | null>(null);
  const [usdRate, setUsdRate] = useState(0);
  const [privacyMode, setPrivacyMode] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const fetchStocks = useCallback(async () => {
    try {
      const [res, rateRes] = await Promise.all([
        fetch('/api/stocks'),
        fetch('/api/exchange-rate'),
      ]);
      const data: IStock[] = await res.json();

      try {
        const rateData = await rateRes.json();
        setUsdRate(rateData.rate || 0);
      } catch { /* ignore */ }

      if (data.length > 0) {
        try {
          const symbolsParam = JSON.stringify(
            data.map((s) => ({ symbol: s.symbol, market: s.market }))
          );
          const pricesRes = await fetch(`/api/prices?symbols=${encodeURIComponent(symbolsParam)}`);
          const pricesData = await pricesRes.json();

          const enriched = data.map((stock) => {
            const priceKey = `${stock.market}_${stock.symbol}`;
            const priceData = pricesData[priceKey];
            return enrichStockWithCalculations(stock, priceData?.currentPrice);
          });
          setStocks(enriched);
        } catch {
          setStocks(data.map((s) => enrichStockWithCalculations(s)));
        }
      } else {
        setStocks([]);
      }
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stocks.findIndex((s) => s._id === active.id);
    const newIndex = stocks.findIndex((s) => s._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const reordered = arrayMove(stocks, oldIndex, newIndex);
    setStocks(reordered);

    // Persist to DB
    try {
      const orderedIds = reordered.map((s) => s._id!);
      await fetch('/api/stocks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (error) {
      console.error('Failed to save order:', error);
      // Revert on failure
      setStocks(arrayMove(reordered, newIndex, oldIndex));
    }
  };

  const handleAddStock = async (data: {
    symbol: string;
    name: string;
    market: Market;
    purchases: Omit<Purchase, '_id'>[];
  }) => {
    const res = await fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setShowAddModal(false);
      fetchStocks();
    }
  };

  const handleEditStock = async (data: {
    symbol: string;
    name: string;
    market: Market;
    purchases: Omit<Purchase, '_id'>[];
  }) => {
    if (!editingStock?._id) return;

    const res = await fetch('/api/stocks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: editingStock._id, ...data }),
    });

    if (res.ok) {
      setEditingStock(null);
      fetchStocks();
    }
  };

  const handleDeleteStock = async (id: string) => {
    const confirmed = await confirmToast('確定要刪除此持股紀錄嗎？');
    if (!confirmed) return;

    const res = await fetch(`/api/stocks?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      notifications.show({ message: '已刪除持股紀錄', color: 'green' });
      fetchStocks();
    } else {
      notifications.show({ message: '刪除失敗，請稍後再試', color: 'red' });
    }
  };

  const handleSellStock = async (data: {
    stockId: string;
    shares: number;
    price: number;
    date: string;
    note?: string;
    exchangeRate?: number;
  }) => {
    const res = await fetch('/api/stocks/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      notifications.show({ message: '賣出成功', color: 'green' });
      setSellingStock(null);
      fetchStocks();
    } else {
      const err = await res.json();
      notifications.show({ message: err.error || '賣出失敗', color: 'red' });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!historyStock?._id) return;
    const confirmed = await confirmToast('確定要刪除此筆賣出紀錄嗎？');
    if (!confirmed) return;

    const res = await fetch(
      `/api/stocks/sell?stockId=${historyStock._id}&saleId=${saleId}`,
      { method: 'DELETE' }
    );

    if (res.ok) {
      notifications.show({ message: '已刪除賣出紀錄', color: 'green' });
      const updatedStock = await res.json();
      // 更新本地 historyStock 以即時反映變化
      setHistoryStock({
        ...historyStock,
        sales: updatedStock.sales,
      });
      fetchStocks();
    } else {
      const err = await res.json();
      notifications.show({ message: err.error || '刪除失敗', color: 'red' });
    }
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <div>
      <Header title="持股管理" subtitle="管理你的股票投資組合" onRefresh={fetchStocks} />

      <Stack p={{ base: 'md', sm: 'xl' }} gap="md">
        <MarketIndicesPanel />

        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="md">
            <Text size="sm" c="dimmed">共 {stocks.length} 檔持股</Text>
            {usdRate > 0 && (
              <Group gap={4}>
                <DollarSign size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">USD/TWD = {usdRate.toFixed(2)}</Text>
              </Group>
            )}
          </Group>
          <Group gap="xs">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
              onClick={() => setPrivacyMode(!privacyMode)}
            >
              {privacyMode ? '顯示金額' : '隱藏金額'}
            </Button>
            <Button
              color="teal"
              leftSection={<Plus size={16} />}
              onClick={() => setShowAddModal(true)}
            >
              新增持股
            </Button>
          </Group>
        </Group>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <StockTable
            stocks={stocks}
            onEdit={(stock) => setEditingStock(stock)}
            onDelete={handleDeleteStock}
            onSell={(stock) => setSellingStock(stock)}
            onViewHistory={(stock) => setHistoryStock(stock)}
            usdRate={usdRate}
            privacyMode={privacyMode}
          />
        </DndContext>
      </Stack>

      <Modal
        opened={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增持股"
        size="lg"
        centered
      >
        <AddStockForm
          onSubmit={handleAddStock}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      <Modal
        opened={!!editingStock}
        onClose={() => setEditingStock(null)}
        title="編輯持股"
        size="lg"
        centered
      >
        {editingStock && (
          <AddStockForm
            initialData={{
              symbol: editingStock.symbol,
              name: editingStock.name,
              market: editingStock.market,
              purchases: editingStock.purchases,
            }}
            onSubmit={handleEditStock}
            onCancel={() => setEditingStock(null)}
          />
        )}
      </Modal>

      <Modal
        opened={!!sellingStock}
        onClose={() => setSellingStock(null)}
        title="賣出股票"
        size="lg"
        centered
      >
        {sellingStock && (
          <SellStockForm
            stock={sellingStock}
            onSubmit={handleSellStock}
            onCancel={() => setSellingStock(null)}
          />
        )}
      </Modal>

      <Modal
        opened={!!historyStock}
        onClose={() => setHistoryStock(null)}
        title="賣出歷史"
        size="lg"
        centered
      >
        {historyStock && (
          <SellHistoryList
            stock={historyStock}
            onDelete={handleDeleteSale}
          />
        )}
      </Modal>
    </div>
  );
}
