'use client';

import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { IAlert } from '@/types';

interface AlertStatusPanelProps {
  alerts: IAlert[];
}

export default function AlertStatusPanel({ alerts }: AlertStatusPanelProps) {
  const activeAlerts = alerts.filter((a) => a.isActive);
  const recentTriggered = alerts.filter(
    (a) => a.lastTriggered && new Date(a.lastTriggered).getTime() > Date.now() - 24 * 60 * 60 * 1000
  );

  const typeLabels: Record<string, string> = {
    above_price: '高於價格',
    below_price: '低於價格',
    above_avg_percent: '高於均價%',
    below_avg_percent: '低於均價%',
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">價格警報</h3>
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Bell className="h-4 w-4" />
          {activeAlerts.length} 個啟用中
        </span>
      </div>

      {recentTriggered.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">過去 24 小時有 {recentTriggered.length} 個警報被觸發</span>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">尚未設定任何警報</p>
        ) : (
          alerts.slice(0, 5).map((alert) => (
            <div
              key={alert._id}
              className={`flex items-center justify-between rounded-lg p-3 ${
                alert.isActive
                  ? 'bg-gray-50 dark:bg-gray-700/50'
                  : 'bg-gray-50/50 opacity-50 dark:bg-gray-700/30'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {alert.stockName} ({alert.stockSymbol})
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {typeLabels[alert.type]} {alert.targetValue}
                </p>
              </div>
              {alert.isActive ? (
                <Bell className="h-4 w-4 text-emerald-500" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
