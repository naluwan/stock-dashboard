'use client';

import { Bell, BellOff, Trash2 } from 'lucide-react';
import { IAlert } from '@/types';

interface AlertListProps {
  alerts: IAlert[];
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export default function AlertList({ alerts, onToggle, onDelete }: AlertListProps) {
  const typeLabels: Record<string, string> = {
    above_price: '高於價格',
    below_price: '低於價格',
    above_avg_percent: '高於均價 %',
    below_avg_percent: '低於均價 %',
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-4 text-gray-400 text-lg">尚未設定任何價格警報</p>
        <p className="text-gray-400 text-sm mt-1">設定警報以在股價達到目標時收到通知</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert._id}
          className={`rounded-xl bg-white p-4 shadow-sm border transition-all dark:bg-gray-800 ${
            alert.isActive
              ? 'border-gray-100 dark:border-gray-700'
              : 'border-gray-100 opacity-60 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${
                alert.isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {alert.isActive ? (
                  <Bell className="h-5 w-5 text-emerald-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    alert.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                  }`}>
                    {alert.market}
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {alert.stockName} ({alert.stockSymbol})
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {typeLabels[alert.type]} {alert.targetValue}{alert.type.includes('percent') ? '%' : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {alert.notifyChannels.map((ch) => (
                    <span key={ch} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-400">
                      {ch === 'email' ? '📧 Email' : '💬 LINE'}
                    </span>
                  ))}
                  {alert.lastTriggered && (
                    <span className="text-xs text-gray-400">
                      上次觸發: {new Date(alert.lastTriggered).toLocaleString('zh-TW')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert._id && onToggle(alert._id, !alert.isActive)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  alert.isActive
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {alert.isActive ? '啟用中' : '已停用'}
              </button>
              <button
                onClick={() => alert._id && onDelete(alert._id)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
