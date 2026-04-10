'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import StockTable from '@/components/stocks/StockTable';
import AddStockForm from '@/components/stocks/AddStockForm';
import SellStockForm from '@/components/stocks/SellStockForm';
import SellHistoryList from '@/components/stocks/SellHistoryList';
import Modal from '@/components/ui/Modal';
import { StockWithCalculations, IStock, Market, Purchase } from '@/types';
import { enrichStockWithCalculations } from '@/lib/utils';
import { Plus, Loader2, DollarSign, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
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
      toast.success('已刪除持股紀錄');
      fetchStocks();
    } else {
      toast.error('刪除失敗，請稍後再試');
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
      toast.success('賣出成功');
      setSellingStock(null);
      fetchStocks();
    } else {
      const err = await res.json();
      toast.error(err.error || '賣出失敗');
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
      toast.success('已刪除賣出紀錄');
      const updatedStock = await res.json();
      // 更新本地 historyStock 以即時反映變化
      setHistoryStock({
        ...historyStock,
        sales: updatedStock.sales,
      });
      fetchStocks();
    } else {
      const err = await res.json();
      toast.error(err.error || '刪除失敗');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div>
      <Header title="持股管理" subtitle="管理你的股票投資組合" onRefresh={fetchStocks} />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {stocks.length} 檔持股
            </p>
            {usdRate > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <DollarSign className="h-3 w-3" />
                USD/TWD = {usdRate.toFixed(2)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {privacyMode ? '顯示金額' : '隱藏金額'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              新增持股
            </button>
          </div>
        </div>

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
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增持股"
      >
        <AddStockForm
          onSubmit={handleAddStock}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingStock}
        onClose={() => setEditingStock(null)}
        title="編輯持股"
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
        isOpen={!!sellingStock}
        onClose={() => setSellingStock(null)}
        title="賣出股票"
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
        isOpen={!!historyStock}
        onClose={() => setHistoryStock(null)}
        title="賣出歷史"
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
