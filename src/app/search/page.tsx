'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Market, PriceData } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import StockPriceChart from '@/components/dashboard/StockPriceChart';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight,
  BarChart3,
  DollarSign,
  Clock,
  Star,
  History,
  Trash2,
} from 'lucide-react';

interface SearchResult {
  symbol: string;
  name: string;
  market: Market;
}

interface HistoryItem {
  symbol: string;
  name: string;
  market: Market;
  searchedAt: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<Market>('TW');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<PriceData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // 搜尋紀錄
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);

  // 自選股票（用於判斷星號狀態）
  const [favoriteSymbols, setFavoriteSymbols] = useState<Set<string>>(new Set());

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/search-history');
      if (res.ok) {
        const data = await res.json();
        setSearchHistory(data);
      }
    } catch { /* ignore */ }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavoriteSymbols(new Set(data.map((f: SearchResult) => `${f.market}_${f.symbol}`)));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, [loadHistory, loadFavorites]);

  // 記錄搜尋紀錄
  const saveSearchHistory = async (symbol: string, name: string, stockMarket: Market) => {
    try {
      await fetch('/api/search-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, name, market: stockMarket }),
      });
      loadHistory();
    } catch { /* ignore */ }
  };

  // 切換自選
  const toggleFavorite = async (symbol: string, name: string, stockMarket: Market) => {
    const key = `${stockMarket}_${symbol}`;
    const isFav = favoriteSymbols.has(key);

    try {
      if (isFav) {
        await fetch(`/api/favorites?symbol=${encodeURIComponent(symbol)}&market=${stockMarket}`, {
          method: 'DELETE',
        });
        setFavoriteSymbols((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, name, market: stockMarket }),
        });
        setFavoriteSymbols((prev) => new Set(prev).add(key));
      }
    } catch { /* ignore */ }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/search-history', { method: 'DELETE' });
      setSearchHistory([]);
    } catch { /* ignore */ }
  };

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

  const handleGetQuote = async (symbol: string, stockMarket: Market, name?: string) => {
    setIsLoadingQuote(true);
    setQuoteError(null);
    setSelectedQuote(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(symbol)}&market=${stockMarket}&action=quote`
      );
      if (res.ok) {
        const data: PriceData = await res.json();
        setSelectedQuote(data);
        // 存搜尋紀錄
        saveSearchHistory(data.symbol, data.name || name || symbol, data.market);
      } else {
        setQuoteError(`無法取得 ${symbol} 的報價資料，請稍後再試`);
      }
    } catch (error) {
      console.error('Quote fetch failed:', error);
      setQuoteError(`取得報價時發生錯誤，請稍後再試`);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const isPositive = (selectedQuote?.change || 0) >= 0;
  const isFavorited = selectedQuote
    ? favoriteSymbols.has(`${selectedQuote.market}_${selectedQuote.symbol}`)
    : false;

  return (
    <div>
      <Header title="股票搜尋" subtitle="查詢即時股價和相關資訊" />

      <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
        {/* 搜尋欄 */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200 sm:p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex gap-2 mb-3 sm:gap-3 sm:mb-4">
            {(['TW', 'US'] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMarket(m);
                  setSearchResults([]);
                  setSelectedQuote(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                  market === m
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {m === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'}
              </button>
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:h-5 sm:w-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={market === 'TW' ? '輸入股票代碼，例如 2330' : '輸入代碼或名稱，例如 AAPL'}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:py-3 sm:pl-10 sm:pr-4 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 sm:gap-2 sm:px-6 sm:py-3"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">搜尋</span>
            </button>
          </div>
        </div>

        {/* 搜尋紀錄 */}
        {searchHistory.length > 0 && !selectedQuote && searchResults.length === 0 && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <History className="h-4 w-4" />
                最近搜尋
              </div>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                清除
              </button>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {searchHistory.map((item) => (
                <button
                  key={`${item.market}_${item.symbol}`}
                  onClick={() => {
                    setMarket(item.market);
                    handleGetQuote(item.symbol, item.market, item.name);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-700/50"
                >
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      item.market === 'TW'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                    }`}
                  >
                    {item.market}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{item.symbol}</span>
                  <span className="text-gray-400 text-xs">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
                  onClick={() => handleGetQuote(result.symbol, result.market, result.name)}
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

        {/* Quote Error */}
        {quoteError && !isLoadingQuote && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center dark:bg-red-900/20 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">{quoteError}</p>
          </div>
        )}

        {/* 股票詳細報價 */}
        {selectedQuote && !isLoadingQuote && (
          <div className="space-y-4">
            {/* 主要報價卡片 */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200 sm:p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
                      {selectedQuote.symbol}
                    </h2>
                    <button
                      onClick={() =>
                        toggleFavorite(selectedQuote.symbol, selectedQuote.name, selectedQuote.market)
                      }
                      className={`ml-1 rounded-full p-1 transition-colors ${
                        isFavorited
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-300 hover:text-yellow-500'
                      }`}
                      title={isFavorited ? '移除自選' : '加入自選'}
                    >
                      <Star className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{selectedQuote.name}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                    {formatCurrency(selectedQuote.currentPrice, selectedQuote.market)}
                  </p>
                  <div
                    className={`mt-0.5 flex items-center gap-1 text-base font-medium sm:justify-end sm:text-lg ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                    {isPositive ? '+' : ''}
                    {selectedQuote.change.toFixed(2)} ({formatPercent(selectedQuote.changePercent)})
                  </div>
                </div>
              </div>
            </div>

            {/* 詳細數據 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-200 sm:p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-[11px] sm:text-xs">前日收盤</span>
                </div>
                <p className="mt-1 text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                  {formatCurrency(selectedQuote.previousClose, selectedQuote.market)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-200 sm:p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[11px] sm:text-xs">今日最高</span>
                </div>
                <p className="mt-1 text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                  {formatCurrency(selectedQuote.high, selectedQuote.market)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-200 sm:p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="text-[11px] sm:text-xs">今日最低</span>
                </div>
                <p className="mt-1 text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                  {formatCurrency(selectedQuote.low, selectedQuote.market)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-200 sm:p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="text-[11px] sm:text-xs">成交量</span>
                </div>
                <p className="mt-1 text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                  {formatNumber(selectedQuote.volume, 0)}
                </p>
              </div>
            </div>

            {/* 價格走勢圖（走勢圖 + K 線圖可切換） */}
            <StockPriceChart
              symbol={selectedQuote.symbol}
              market={selectedQuote.market}
              currentPrice={selectedQuote.currentPrice}
            />

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
