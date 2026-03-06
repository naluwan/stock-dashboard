'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Market, PriceData } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight,
  BarChart3,
  Activity,
  DollarSign,
  Clock,
} from 'lucide-react';

interface SearchResult {
  symbol: string;
  name: string;
  market: Market;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<Market>('TW');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<PriceData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSelectedQuote(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&market=${market}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetQuote = async (symbol: string, stockMarket: Market) => {
    setIsLoadingQuote(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(symbol)}&market=${stockMarket}&action=quote`
      );
      if (res.ok) {
        const data: PriceData = await res.json();
        setSelectedQuote(data);
      }
    } catch (error) {
      console.error('Quote fetch failed:', error);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const isPositive = (selectedQuote?.change || 0) >= 0;

  return (
    <div>
      <Header title="股票搜尋" subtitle="查詢即時股價和相關資訊" />

      <div className="p-6 space-y-6">
        {/* 搜尋欄 */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex gap-3 mb-4">
            {(['TW', 'US'] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMarket(m);
                  setSearchResults([]);
                  setSelectedQuote(null);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  market === m
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {m === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={market === 'TW' ? '輸入股票代碼，例如 2330' : '輸入股票代碼或名稱，例如 AAPL 或 Apple'}
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              搜尋
            </button>
          </div>
        </div>

        {/* 搜尋結果列表 */}
        {searchResults.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                搜尋結果 ({searchResults.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {searchResults.map((result) => (
                <button
                  key={`${result.market}_${result.symbol}`}
                  onClick={() => handleGetQuote(result.symbol, result.market)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        result.market === 'TW'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                      }`}
                    >
                      {result.market === 'TW' ? '台股' : '美股'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{result.symbol}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{result.name}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Quote */}
        {isLoadingQuote && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        )}

        {/* 股票詳細報價 */}
        {selectedQuote && !isLoadingQuote && (
          <div className="space-y-4">
            {/* 主要報價卡片 */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        selectedQuote.market === 'TW'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                      }`}
                    >
                      {selectedQuote.market === 'TW' ? '台股' : '美股'}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedQuote.symbol}
                    </h2>
                  </div>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">{selectedQuote.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(selectedQuote.currentPrice, selectedQuote.market)}
                  </p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-lg font-medium ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    {isPositive ? '+' : ''}
                    {selectedQuote.change.toFixed(2)} ({formatPercent(selectedQuote.changePercent)})
                  </div>
                </div>
              </div>
            </div>

            {/* 詳細數據 */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">前日收盤</span>
                </div>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(selectedQuote.previousClose, selectedQuote.market)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">今日最高</span>
                </div>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(selectedQuote.high, selectedQuote.market)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs">今日最低</span>
                </div>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(selectedQuote.low, selectedQuote.market)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs">成交量</span>
                </div>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {formatNumber(selectedQuote.volume, 0)}
                </p>
              </div>
            </div>

            {/* 價格區間指示器 */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">今日價格區間</h3>
              </div>
              {selectedQuote.high > 0 && selectedQuote.low > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{formatCurrency(selectedQuote.low, selectedQuote.market)}</span>
                    <span>{formatCurrency(selectedQuote.high, selectedQuote.market)}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`absolute h-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{
                        left: '0%',
                        width: `${
                          selectedQuote.high === selectedQuote.low
                            ? 100
                            : ((selectedQuote.currentPrice - selectedQuote.low) /
                                (selectedQuote.high - selectedQuote.low)) *
                              100
                        }%`,
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white bg-gray-900 shadow dark:border-gray-800 dark:bg-white"
                      style={{
                        left: `${
                          selectedQuote.high === selectedQuote.low
                            ? 50
                            : ((selectedQuote.currentPrice - selectedQuote.low) /
                                (selectedQuote.high - selectedQuote.low)) *
                              100
                        }%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    目前: {formatCurrency(selectedQuote.currentPrice, selectedQuote.market)}
                  </p>
                </div>
              )}
            </div>

            {/* 更新時間 */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>最後更新: {new Date(selectedQuote.updatedAt).toLocaleString('zh-TW')}</span>
            </div>
          </div>
        )}

        {/* 無結果提示 */}
        {!isSearching && searchResults.length === 0 && query && !selectedQuote && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <Search className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-400 text-lg">找不到相關股票</p>
            <p className="text-gray-400 text-sm mt-1">請確認代碼是否正確，或切換市場再試試</p>
          </div>
        )}
      </div>
    </div>
  );
}
