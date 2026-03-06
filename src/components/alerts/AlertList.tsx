'use client';

import { Bell, BellOff, Trash2, RotateCcw } from 'lucide-react';
import { IAlert } from '@/types';

interface AlertListProps {
  alerts: IAlert[];
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onResetCount?: (id: string) => void;
}

export default function AlertList({ alerts, onToggle, onDelete, onResetCount }: AlertListProps) {
  const typeLabels: Record<string, string> = {
    above_price: '高於價格',
    below_price: '低於價格',
    above_avg_percent: '高於均價 %',
    below_avg_percent: '低於均價 %',
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow-sm border border-gray-200 sm:p-12 dark:bg-gray-800 dark:border-gray-700">
        <Bell className="mx-auto h-10 w-10 text-gray-300 sm:h-12 sm:w-12 dark:text-gray-600" />
        <p className="mt-3 text-gray-400 text-base sm:text-lg">尚未設定任何價格警報</p>
        <p className="text-gray-400 text-xs mt-1 sm:text-sm">設定警報以在股價達到目標時收到通知</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const triggerCount = alert.triggerCount || 0;
        const maxTriggers = alert.maxTriggers || 0;
        const isMaxedOut = maxTriggers > 0 && triggerCount >= maxTriggers;

        return (
          <div
            key={alert._id}
            className={`rounded-xl bg-white p-3 shadow-sm border transition-all sm:p-4 dark:bg-gray-800 ${
              alert.isActive
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-gray-200 opacity-60 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2 sm:items-center">
              <div className="flex items-start gap-2 sm:items-center sm:gap-3 min-w-0">
                <div className={`shrink-0 rounded-lg p-1.5 sm:p-2 ${
                  alert.isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {alert.isActive ? (
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                  ) : (
                    <BellOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className={`text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded ${
                      alert.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                    }`}>
                      {alert.market}
                    </span>
                    <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      {alert.stockName} ({alert.stockSymbol})
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {typeLabels[alert.type]} {alert.targetValue}{alert.type.includes('percent') ? '%' : ''}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                    {alert.notifyChannels.map((ch) => (
                      <span key={ch} className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-400">
                        {ch === 'email' ? 'Email' : 'LINE'}
                      </span>
                    ))}
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium ${
                      isMaxedOut
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      已觸發 {triggerCount}/{maxTriggers === 0 ? '∞' : maxTriggers} 次
                    </span>
                    {alert.lastTriggered && (
                      <span className="hidden sm:inline text-xs text-gray-400">
                        上次: {new Date(alert.lastTriggered).toLocaleString('zh-TW')}
                      </span>
                    )}
                  </div>
                  {alert.lastTriggered && (
                    <p className="sm:hidden text-[10px] text-gray-400 mt-0.5">
                      上次觸發: {new Date(alert.lastTriggered).toLocaleString('zh-TW')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {isMaxedOut && onResetCount && (
                  <button
                    onClick={() => alert._id && onResetCount(alert._id)}
                    className="rounded-lg p-1 sm:p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30"
                    title="重置觸發次數並重新啟用"
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                )}
                <button
                  onClick={() => alert._id && onToggle(alert._id, !alert.isActive)}
                  className={`rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                    alert.isActive
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {alert.isActive ? '啟用' : '停用'}
                </button>
                <button
                  onClick={() => alert._id && onDelete(alert._id)}
                  className="rounded-lg p-1 sm:p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
