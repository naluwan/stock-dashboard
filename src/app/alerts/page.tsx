'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import AlertForm from '@/components/alerts/AlertForm';
import AlertList from '@/components/alerts/AlertList';
import Modal from '@/components/ui/Modal';
import { IAlert, IStock, AlertType, Market } from '@/types';
import { Plus, Loader2 } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [stocks, setStocks] = useState<IStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, stocksRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/stocks'),
      ]);
      const alertsData = await alertsRes.json();
      const stocksData = await stocksRes.json();
      setAlerts(alertsData);
      setStocks(stocksData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAlert = async (data: {
    stockSymbol: string;
    stockName: string;
    market: Market;
    type: AlertType;
    targetValue: number;
    notifyChannels: ('email' | 'line')[];
  }) => {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleToggleAlert = async (id: string, isActive: boolean) => {
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, isActive }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm('確定要刪除此警報嗎？')) return;
    const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
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
      <Header title="價格警報" subtitle="設定股票價格通知條件" onRefresh={fetchData} />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {alerts.length} 個警報，{alerts.filter((a) => a.isActive).length} 個啟用中
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={stocks.length === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            新增警報
          </button>
        </div>

        {stocks.length === 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            請先在「持股管理」新增持股，才能設定價格警報
          </div>
        )}

        <AlertList
          alerts={alerts}
          onToggle={handleToggleAlert}
          onDelete={handleDeleteAlert}
        />
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增價格警報"
      >
        <AlertForm
          stocks={stocks}
          onSubmit={handleCreateAlert}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}
