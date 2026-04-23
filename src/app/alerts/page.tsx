'use client';

import { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Center, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Header from '@/components/layout/Header';
import AlertForm from '@/components/alerts/AlertForm';
import AlertList from '@/components/alerts/AlertList';
import { IAlert, IStock, AlertType, Market } from '@/types';
import { Plus, Zap } from 'lucide-react';
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
      notifications.show({ message: '已刪除警報', color: 'green' });
      fetchData();
    } else {
      notifications.show({ message: '刪除失敗，請稍後再試', color: 'red' });
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
      <Center h="100vh">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <div>
      <Header title="價格警報" subtitle="設定股票價格通知條件" onRefresh={fetchData} />

      <Stack p={{ base: 'md', sm: 'xl' }} gap="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <div>
            <Text size="sm" c="dimmed">
              共 {alerts.length} 個警報，{alerts.filter((a) => a.isActive).length} 個啟用中
            </Text>
            {lastCheckResult && <Text size="xs" c="dimmed" mt={4}>{lastCheckResult}</Text>}
          </div>
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={isChecking ? <Loader size="xs" /> : <Zap size={16} />}
              onClick={handleManualCheck}
              disabled={isChecking || alerts.filter((a) => a.isActive).length === 0}
            >
              立即檢查
            </Button>
            <Button
              color="teal"
              leftSection={<Plus size={16} />}
              onClick={() => setShowAddModal(true)}
              disabled={stocks.length === 0}
            >
              新增警報
            </Button>
          </Group>
        </Group>

        <Alert color="blue" variant="light" py="xs">
          <Text size="xs">
            系統每 5 分鐘自動檢查一次警報。台股在交易時段（08:30–13:45）檢查，美股在含盤前盤後的交易時段（約台灣時間 15:00–隔日 09:00）檢查。同一警報 30 分鐘內不會重複觸發。
          </Text>
        </Alert>

        {stocks.length === 0 && (
          <Alert color="yellow" variant="light">
            請先在「持股管理」新增持股，才能設定價格警報
          </Alert>
        )}

        <AlertList
          alerts={alerts}
          onToggle={handleToggleAlert}
          onDelete={handleDeleteAlert}
          onResetCount={handleResetCount}
        />
      </Stack>

      <Modal
        opened={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增價格警報"
        size="lg"
        centered
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
