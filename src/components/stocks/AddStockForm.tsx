'use client';

import { useState, useEffect } from 'react';
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

// 將數字轉為顯示用字串，0 顯示空字串（方便輸入）
const numToStr = (n: number | undefined): string => {
  if (n === undefined || n === null) return '';
  if (n === 0) return '';
  return String(n);
};

// 安全解析數字，保留 0
const safeParseFloat = (s: string): number => {
  if (s === '' || s === '-') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export default function AddStockForm({ onSubmit, onCancel, initialData }: AddStockFormProps) {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [name, setName] = useState(initialData?.name || '');
  const [market, setMarket] = useState<Market>(initialData?.market || 'TW');

  // 用字串追蹤所有數字輸入，避免 type="number" 吃掉中間狀態（如 "0.", "0.5"）
  const initShares = initialData?.purchases?.map((p) => numToStr(p.shares)) || [''];
  const initPrices = initialData?.purchases?.map((p) => numToStr(p.price)) || [''];
  const initAmounts = initialData?.purchases?.map((p) => numToStr(p.shares * p.price)) || [''];
  const initRates = initialData?.purchases?.map((p) => numToStr(p.exchangeRate)) || [''];
  const initDates = initialData?.purchases?.map((p) => {
    const d = p.date instanceof Date ? p.date : new Date(p.date);
    return d.toISOString().split('T')[0];
  }) || [new Date().toISOString().split('T')[0]];
  const initNotes = initialData?.purchases?.map((p) => p.note || '') || [''];
  const initCommissions = initialData?.purchases?.map((p) => numToStr(p.commission)) || [''];

  const [sharesInputs, setSharesInputs] = useState<string[]>(initShares);
  const [priceInputs, setPriceInputs] = useState<string[]>(initPrices);
  const [amountInputs, setAmountInputs] = useState<string[]>(initAmounts);
  const [rateInputs, setRateInputs] = useState<string[]>(initRates);
  const [dateInputs, setDateInputs] = useState<string[]>(initDates);
  const [noteInputs, setNoteInputs] = useState<string[]>(initNotes);
  const [commissionInputs, setCommissionInputs] = useState<string[]>(initCommissions);

  const [currentUsdRate, setCurrentUsdRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 取得當日匯率供預設值使用
  useEffect(() => {
    if (market === 'US') {
      fetch('/api/exchange-rate')
        .then(res => res.json())
        .then(data => { if (data.rate) setCurrentUsdRate(data.rate); })
        .catch(() => {});
    }
  }, [market]);

  const addPurchase = () => {
    setSharesInputs([...sharesInputs, '']);
    setPriceInputs([...priceInputs, '']);
    setAmountInputs([...amountInputs, '']);
    setRateInputs([...rateInputs, '']);
    setDateInputs([...dateInputs, new Date().toISOString().split('T')[0]]);
    setNoteInputs([...noteInputs, '']);
    setCommissionInputs([...commissionInputs, '']);
  };

  const removePurchase = (index: number) => {
    if (sharesInputs.length > 1) {
      const remove = (_: string, i: number) => i !== index;
      setSharesInputs(sharesInputs.filter(remove));
      setPriceInputs(priceInputs.filter(remove));
      setAmountInputs(amountInputs.filter(remove));
      setRateInputs(rateInputs.filter(remove));
      setDateInputs(dateInputs.filter(remove));
      setNoteInputs(noteInputs.filter(remove));
      setCommissionInputs(commissionInputs.filter(remove));
    }
  };

  // 更新字串陣列 helper
  const updateAt = (arr: string[], index: number, value: string): string[] => {
    const newArr = [...arr];
    newArr[index] = value;
    return newArr;
  };

  // 當股數改變時，如果有價格就自動算總金額
  const handleSharesChange = (index: number, raw: string) => {
    setSharesInputs(updateAt(sharesInputs, index, raw));
    const shares = safeParseFloat(raw);
    const price = safeParseFloat(priceInputs[index]);
    if (price > 0 && shares > 0) {
      setAmountInputs(updateAt(amountInputs, index, String(Math.round(shares * price * 100) / 100)));
    }
  };

  // 當價格改變時，如果有股數就自動算總金額
  const handlePriceChange = (index: number, raw: string) => {
    setPriceInputs(updateAt(priceInputs, index, raw));
    const price = safeParseFloat(raw);
    const shares = safeParseFloat(sharesInputs[index]);
    if (shares > 0 && price > 0) {
      setAmountInputs(updateAt(amountInputs, index, String(Math.round(shares * price * 100) / 100)));
    }
  };

  // 當總金額改變時，根據已有的另一個值反算
  const handleAmountChange = (index: number, raw: string) => {
    setAmountInputs(updateAt(amountInputs, index, raw));
    const amount = safeParseFloat(raw);
    const price = safeParseFloat(priceInputs[index]);
    const shares = safeParseFloat(sharesInputs[index]);

    if (price > 0 && amount > 0) {
      // 有價格 → 算股數
      setSharesInputs(updateAt(sharesInputs, index, String(Math.round(amount / price * 100) / 100)));
    } else if (shares > 0 && amount > 0) {
      // 有股數 → 算價格
      setPriceInputs(updateAt(priceInputs, index, String(Math.round(amount / shares * 100) / 100)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const purchases: Omit<Purchase, '_id'>[] = sharesInputs.map((_, i) => {
        const base: Omit<Purchase, '_id'> = {
          shares: safeParseFloat(sharesInputs[i]),
          price: safeParseFloat(priceInputs[i]),
          date: new Date(dateInputs[i]),
          note: noteInputs[i] || undefined,
        };
        // 手續費
        const comm = safeParseFloat(commissionInputs[i]);
        if (comm > 0) base.commission = comm;
        // 美股附加匯率：有填就用填的，沒填用當日匯率
        if (market === 'US') {
          const rate = safeParseFloat(rateInputs[i]);
          base.exchangeRate = rate > 0 ? rate : (currentUsdRate || undefined);
        }
        return base;
      });
      await onSubmit({ symbol: symbol.toUpperCase(), name, market, purchases });
    } finally {
      setIsSubmitting(false);
    }
  };

  const purchaseCount = sharesInputs.length;

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
          {Array.from({ length: purchaseCount }).map((_, index) => (
            <div key={index} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  第 {index + 1} 筆
                </span>
                {purchaseCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removePurchase(index)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className={`grid grid-cols-2 gap-2 ${market === 'US' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">股數</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sharesInputs[index]}
                    onChange={(e) => handleSharesChange(index, e.target.value)}
                    placeholder="0"
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">買入價格</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceInputs[index]}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    placeholder="0"
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">總金額</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInputs[index]}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    placeholder="自動計算"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">日期</label>
                  <input
                    type="date"
                    value={dateInputs[index]}
                    onChange={(e) => setDateInputs(updateAt(dateInputs, index, e.target.value))}
                    required
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                {market === 'US' && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">匯率</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInputs[index]}
                      onChange={(e) => setRateInputs(updateAt(rateInputs, index, e.target.value))}
                      placeholder={currentUsdRate > 0 ? currentUsdRate.toFixed(2) : '當日匯率'}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">手續費</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={commissionInputs[index]}
                    onChange={(e) => setCommissionInputs(updateAt(commissionInputs, index, e.target.value))}
                    placeholder="0"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={noteInputs[index]}
                    onChange={(e) => setNoteInputs(updateAt(noteInputs, index, e.target.value))}
                    placeholder="備註（選填）"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none mt-5"
                  />
                </div>
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
