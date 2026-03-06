'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import StockTable from '@/components/stocks/StockTable';
import AddStockForm from '@/components/stocks/AddStockForm';
import Modal from '@/components/ui/Modal';
import { StockWithCalculations, IStock, Market, Purchase } from '@/types';
import { enrichStockWithCalculations } from '@/lib/utils';
import { Plus, Loader2 } from 'lucide-react';

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockWithCalculations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStock, setEditingStock] = useState<StockWithCalculations | null>(null);

  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch('/api/stocks');
      const data: IStock[] = await res.json();

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
    if (!confirm('確定要刪除此持股紀錄嗎？')) return;

    const res = await fetch(`/api/stocks?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchStocks();
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

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {stocks.length} 檔持股
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            新增持股
          </button>
        </div>

        <StockTable
          stocks={stocks}
          onEdit={(stock) => setEditingStock(stock)}
          onDelete={handleDeleteStock}
        />
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
    </div>
  );
}
