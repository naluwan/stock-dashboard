'use client';

import { useState, useEffect } from 'react';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatShares } from '@/lib/utils';

interface SellStockFormProps {
  stock: StockWithCalculations;
  onSubmit: (data: {
    stockId: string;
    shares: number;
    price: number;
    date: string;
    note?: string;
    exchangeRate?: number;
  }) => Promise<void>;
  onCancel: () => void;
}

const safeParseFloat = (s: string): number => {
  if (s === '' || s === '-') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export default function SellStockForm({ stock, onSubmit, onCancel }: SellStockFormProps) {
  const [sharesInput, setSharesInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [noteInput, setNoteInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [currentUsdRate, setCurrentUsdRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUS = stock.market === 'US';

  useEffect(() => {
    if (isUS) {
      fetch('/api/exchange-rate')
        .then(res => res.json())
        .then(data => { if (data.rate) setCurrentUsdRate(data.rate); })
        .catch(() => {});
    }
  }, [isUS]);

  // 填入目前價格
  useEffect(() => {
    if (stock.currentPrice) {
      setPriceInput(String(stock.currentPrice));
    }
  }, [stock.currentPrice]);

  const handleSharesChange = (raw: string) => {
    setSharesInput(raw);
    const shares = safeParseFloat(raw);
    const price = safeParseFloat(priceInput);
    if (price > 0 && shares > 0) {
      setAmountInput(String(Math.round(shares * price * 100) / 100));
    }
  };

  const handlePriceChange = (raw: string) => {
    setPriceInput(raw);
    const price = safeParseFloat(raw);
    const shares = safeParseFloat(sharesInput);
    if (shares > 0 && price > 0) {
      setAmountInput(String(Math.round(shares * price * 100) / 100));
    }
  };

  const handleAmountChange = (raw: string) => {
    setAmountInput(raw);
    const amount = safeParseFloat(raw);
    const price = safeParseFloat(priceInput);
    const shares = safeParseFloat(sharesInput);
    if (price > 0 && amount > 0) {
      setSharesInput(String(Math.round(amount / price * 100) / 100));
    } else if (shares > 0 && amount > 0) {
      setPriceInput(String(Math.round(amount / shares * 100) / 100));
    }
  };

  const sellAll = () => {
    setSharesInput(String(stock.totalShares));
    const price = safeParseFloat(priceInput);
    if (price > 0) {
      setAmountInput(String(Math.round(stock.totalShares * price * 100) / 100));
    }
  };

  const shares = safeParseFloat(sharesInput);
  const estimatedPL = shares > 0
    ? (safeParseFloat(priceInput) - stock.averagePrice) * shares
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shares <= 0) return;
    if (shares > stock.totalShares) return;

    setIsSubmitting(true);
    try {
      const data: {
        stockId: string;
        shares: number;
        price: number;
        date: string;
        note?: string;
        exchangeRate?: number;
      } = {
        stockId: stock._id!,
        shares,
        price: safeParseFloat(priceInput),
        date: dateInput,
        note: noteInput || undefined,
      };

      if (isUS) {
        const rate = safeParseFloat(rateInput);
        data.exchangeRate = rate > 0 ? rate : (currentUsdRate || undefined);
      }

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 股票資訊 */}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mr-2 ${
              stock.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
            }`}>{stock.market}</span>
            <span className="font-bold text-gray-900 dark:text-white">{stock.symbol}</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{stock.name}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-400">持有股數</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatShares(stock.totalShares, stock.market)}</p>
          </div>
          <div>
            <p className="text-gray-400">平均成本</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stock.averagePrice, stock.market)}</p>
          </div>
          <div>
            <p className="text-gray-400">目前價格</p>
            <p className="font-semibold text-gray-900 dark:text-white">{stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}</p>
          </div>
        </div>
      </div>

      {/* 賣出表單 */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 dark:text-gray-400">賣出股數</label>
              <button type="button" onClick={sellAll} className="text-[10px] text-emerald-500 hover:text-emerald-600">
                全部賣出
              </button>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={sharesInput}
              onChange={(e) => handleSharesChange(e.target.value)}
              placeholder="0"
              required
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
            {shares > stock.totalShares && (
              <p className="text-[10px] text-red-500 mt-0.5">超過持有股數</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">賣出價格</label>
            <input
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => handlePriceChange(e.target.value)}
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
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="自動計算"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">日期</label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          {isUS && (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">匯率</label>
              <input
                type="text"
                inputMode="decimal"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder={currentUsdRate > 0 ? currentUsdRate.toFixed(2) : '當日匯率'}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="備註（選填）"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 預估損益 */}
      {shares > 0 && safeParseFloat(priceInput) > 0 && (
        <div className={`rounded-lg p-3 text-sm ${
          estimatedPL >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          <p className="font-medium">
            預估已實現損益：{formatCurrency(estimatedPL, stock.market)}
            <span className="ml-1 text-xs">
              ({stock.averagePrice > 0 ? ((estimatedPL / (stock.averagePrice * shares)) * 100).toFixed(2) : '0.00'}%)
            </span>
          </p>
        </div>
      )}

      {/* 按鈕 */}
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
          disabled={isSubmitting || shares <= 0 || shares > stock.totalShares}
          className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isSubmitting ? '處理中...' : '確認賣出'}
        </button>
      </div>
    </form>
  );
}
