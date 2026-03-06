'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import StockCard from '@/components/dashboard/StockCard';
import AlertStatusPanel from '@/components/dashboard/AlertStatusPanel';
import PriceChart from '@/components/dashboard/PriceChart';
import { StockWithCalculations, IAlert, IStock } from '@/types';
import { enrichStockWithCalculations } from '@/lib/utils';
import { Loader2, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const [stocks, setStocks] = useState<StockWithCalculations[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usdRate, setUsdRate] = useState(0);
  const [privacyMode, setPrivacyMode] = useState(true); // 預設隱藏

  const fetchData = useCallback(async () => {
    try {
      const [stocksRes, alertsRes, rateRes] = await Promise.all([
        fetch('/api/stocks'),
        fetch('/api/alerts'),
        fetch('/api/exchange-rate'),
      ]);

      const stocksData: IStock[] = await stocksRes.json();
      const alertsData: IAlert[] = await alertsRes.json();

      try {
        const rateData = await rateRes.json();
        setUsdRate(rateData.rate || 0);
      } catch { /* ignore */ }

      if (stocksData.length > 0) {
        try {
          const symbolsParam = JSON.stringify(
            stocksData.map((s) => ({ symbol: s.symbol, market: s.market }))
          );
          const pricesRes = await fetch(`/api/prices?symbols=${encodeURIComponent(symbolsParam)}`);
          const pricesData = await pricesRes.json();

          const enrichedStocks = stocksData.map((stock) => {
            const priceKey = `${stock.market}_${stock.symbol}`;
            const priceData = pricesData[priceKey];
            return enrichStockWithCalculations(stock, priceData?.currentPrice);
          });

          setStocks(enrichedStocks);
        } catch {
          setStocks(stocksData.map((stock) => enrichStockWithCalculations(stock)));
        }
      } else {
        setStocks([]);
      }

      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="投資組合總覽" subtitle="即時監控你的股票投資" onRefresh={fetchData} />

      <div className="p-4 space-y-5 sm:p-6">
        {/* 匯率資訊 */}
        {usdRate > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>今日匯率：USD/TWD = <strong className="text-gray-700 dark:text-gray-200">{usdRate.toFixed(2)}</strong></span>
          </div>
        )}

        {/* 摘要卡片 */}
        <PortfolioSummary
          stocks={stocks}
          usdRate={usdRate}
          privacyMode={privacyMode}
          onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        />

        {/* 持股一覽 + 右側面板 */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* 持股卡片 */}
          <div className="xl:col-span-2">
            {stocks.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm border border-gray-200 sm:p-12 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-gray-400 text-base sm:text-lg">尚未新增任何持股</p>
                <p className="text-gray-400 text-xs mt-1 sm:text-sm">前往「持股管理」開始記錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {stocks.map((stock) => (
                  <StockCard key={stock._id} stock={stock} usdRate={usdRate} privacyMode={privacyMode} />
                ))}
              </div>
            )}
          </div>

          {/* 右側：圓餅圖 + 警報 */}
          <div className="space-y-5">
            <PriceChart stocks={stocks} />
            <AlertStatusPanel alerts={alerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
