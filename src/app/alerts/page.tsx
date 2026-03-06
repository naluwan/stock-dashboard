'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import AlertForm from '@/components/alerts/AlertForm';
import AlertList from '@/components/alerts/AlertList';
import Modal from '@/components/ui/Modal';
import { IAlert, IStock, AlertType, Market } from '@/types';
import { Plus, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/confirmToast';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [stocks, setStocks] = useState<IStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);

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
    maxTriggers: number;
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
    const confirmed = await confirmToast('確定要刪除此警報嗎？');
    if (!confirmed) return;
    const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('已刪除警報');
      fetchData();
    } else {
      toast.error('刪除失敗，請稍後再試');
    }
  };

  const handleResetCount = async (id: string) => {
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, triggerCount: 0, isActive: true }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    setLastCheckResult(null);
    try {
      const res = await fetch('/api/cron/check-alerts');
      if (res.ok) {
        const data = await res.json();
        const parts = [];
        if (data.triggered > 0) {
          parts.push(`觸發 ${data.triggered} 個警報`);
        } else {
          parts.push('未觸發任何警報');
        }
        if (data.skippedMarkets?.length > 0) {
          parts.push(`${data.skippedMarkets.join('、')} 市場非交易時段`);
        }
        setLastCheckResult(parts.join('，'));
        fetchData(); // 重新載入最新狀態
      }
    } catch {
      setLastCheckResult('檢查失敗');
    } finally {
      setIsChecking(false);
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

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {alerts.length} 個警報，{alerts.filter((a) => a.isActive).length} 個啟用中
            </p>
            {lastCheckResult && (
              <p className="text-xs text-gray-400 mt-1">{lastCheckResult}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManualCheck}
              disabled={isChecking || alerts.filter((a) => a.isActive).length === 0}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">立即檢查</span>
              <span className="sm:hidden">檢查</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={stocks.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              新增警報
            </button>
          </div>
        </div>

        {/* 排程說明 */}
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <p>系統每 5 分鐘自動檢查一次警報。台股在交易時段（08:30–13:45）檢查，美股在含盤前盤後的交易時段（約台灣時間 15:00–隔日 09:00）檢查。同一警報 30 分鐘內不會重複觸發。</p>
        </div>

        {stocks.length === 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 sm:p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            請先在「持股管理」新增持股，才能設定價格警報
          </div>
        )}

        <AlertList
          alerts={alerts}
          onToggle={handleToggleAlert}
          onDelete={handleDeleteAlert}
          onResetCount={handleResetCount}
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
