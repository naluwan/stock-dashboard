'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Market, Purchase } from '@/types';

interface AddStockFormProps {
  onSubmit: (data: {
    symbol: string;
    name: string;
    market: Market;
    purchases: Omit<Purchase, '_id'>[];
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    symbol: string;
    name: string;
    market: Market;
    purchases: Purchase[];
  };
}

export default function AddStockForm({ onSubmit, onCancel, initialData }: AddStockFormProps) {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [name, setName] = useState(initialData?.name || '');
  const [market, setMarket] = useState<Market>(initialData?.market || 'TW');
  const [purchases, setPurchases] = useState<Omit<Purchase, '_id'>[]>(
    initialData?.purchases || [{ shares: 0, price: 0, date: new Date(), note: '' }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPurchase = () => {
    setPurchases([...purchases, { shares: 0, price: 0, date: new Date(), note: '' }]);
  };

  const removePurchase = (index: number) => {
    if (purchases.length > 1) {
      setPurchases(purchases.filter((_, i) => i !== index));
    }
  };

  const updatePurchase = (index: number, field: string, value: string | number) => {
    const updated = [...purchases];
    if (field === 'date') {
      updated[index] = { ...updated[index], [field]: new Date(value as string) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPurchases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ symbol: symbol.toUpperCase(), name, market, purchases });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            股票代碼
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder={market === 'TW' ? '例: 2330' : '例: AAPL'}
            required
            disabled={!!initialData}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            股票名稱
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 台積電"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          市場
        </label>
        <div className="flex gap-3">
          {(['TW', 'US'] as Market[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarket(m)}
              disabled={!!initialData}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                market === m
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              } disabled:opacity-50`}
            >
              {m === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            購買紀錄
          </label>
          <button
            type="button"
            onClick={addPurchase}
            className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-600"
          >
            <Plus className="h-3 w-3" /> 新增一筆
          </button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {purchases.map((purchase, index) => (
            <div key={index} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  第 {index + 1} 筆
                </span>
                {purchases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePurchase(index)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">股數</label>
                  <input
                    type="number"
                    value={purchase.shares || ''}
                    onChange={(e) => updatePurchase(index, 'shares', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">買入價格</label>
                  <input
                    type="number"
                    value={purchase.price || ''}
                    onChange={(e) => updatePurchase(index, 'price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">日期</label>
                  <input
                    type="date"
                    value={purchase.date instanceof Date ? purchase.date.toISOString().split('T')[0] : new Date(purchase.date).toISOString().split('T')[0]}
                    onChange={(e) => updatePurchase(index, 'date', e.target.value)}
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  value={purchase.note || ''}
                  onChange={(e) => updatePurchase(index, 'note', e.target.value)}
                  placeholder="備註（選填）"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
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
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {isSubmitting ? '處理中...' : initialData ? '更新' : '新增'}
        </button>
      </div>
    </form>
  );
}
