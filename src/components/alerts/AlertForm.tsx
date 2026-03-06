'use client';

import { useState } from 'react';
import { AlertType, IStock, Market } from '@/types';

interface AlertFormProps {
  stocks: IStock[];
  onSubmit: (data: {
    stockSymbol: string;
    stockName: string;
    market: Market;
    type: AlertType;
    targetValue: number;
    maxTriggers: number;
    notifyChannels: ('email' | 'line')[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function AlertForm({ stocks, onSubmit, onCancel }: AlertFormProps) {
  const [selectedStock, setSelectedStock] = useState('');
  const [type, setType] = useState<AlertType>('below_price');
  const [targetValue, setTargetValue] = useState<number>(0);
  const [maxTriggers, setMaxTriggers] = useState<number>(0);
  const [channels, setChannels] = useState<('email' | 'line')[]>(['email']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStockData = stocks.find((s) => `${s.market}_${s.symbol}` === selectedStock);

  const alertTypes: { value: AlertType; label: string; description: string }[] = [
    { value: 'below_price', label: '低於指定價格', description: '當股價低於設定的價格時通知' },
    { value: 'above_price', label: '高於指定價格', description: '當股價高於設定的價格時通知' },
    { value: 'below_avg_percent', label: '低於均價百分比', description: '當股價低於平均成本的某個百分比時通知' },
    { value: 'above_avg_percent', label: '高於均價百分比', description: '當股價高於平均成本的某個百分比時通知' },
  ];

  const triggerOptions = [
    { value: 0, label: '持續通知（不限次數）' },
    { value: 1, label: '只通知 1 次' },
    { value: 3, label: '最多通知 3 次' },
    { value: 5, label: '最多通知 5 次' },
    { value: 10, label: '最多通知 10 次' },
  ];

  const toggleChannel = (ch: 'email' | 'line') => {
    if (channels.includes(ch)) {
      if (channels.length > 1) setChannels(channels.filter((c) => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockData) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        stockSymbol: selectedStockData.symbol,
        stockName: selectedStockData.name,
        market: selectedStockData.market,
        type,
        targetValue,
        maxTriggers,
        notifyChannels: channels,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          選擇股票
        </label>
        <select
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">請選擇...</option>
          {stocks.map((s) => (
            <option key={`${s.market}_${s.symbol}`} value={`${s.market}_${s.symbol}`}>
              [{s.market}] {s.symbol} - {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          警報類型
        </label>
        <div className="space-y-2">
          {alertTypes.map((at) => (
            <label
              key={at.value}
              className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                type === at.value
                  ? 'bg-emerald-50 border border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700'
                  : 'bg-gray-50 border border-transparent hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700'
              }`}
            >
              <input
                type="radio"
                name="alertType"
                value={at.value}
                checked={type === at.value}
                onChange={() => setType(at.value)}
                className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{at.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{at.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {type.includes('percent') ? '百分比 (%)' : '目標價格'}
        </label>
        <input
          type="number"
          value={targetValue || ''}
          onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
          min="0"
          step={type.includes('percent') ? '1' : '0.01'}
          required
          placeholder={type.includes('percent') ? '例: 10 (代表 10%)' : '例: 500'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          觸發次數限制
        </label>
        <select
          value={maxTriggers}
          onChange={(e) => setMaxTriggers(parseInt(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {triggerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {maxTriggers === 0
            ? '警報將持續觸發直到手動停用'
            : `達到 ${maxTriggers} 次後自動停用警報`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          通知管道
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => toggleChannel('email')}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              channels.includes('email')
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => toggleChannel('line')}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              channels.includes('line')
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            LINE
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedStock}
          className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {isSubmitting ? '處理中...' : '建立警報'}
        </button>
      </div>
    </form>
  );
}
