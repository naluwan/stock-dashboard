'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import StockCard from '@/components/dashboard/StockCard';
import AlertStatusPanel from '@/components/dashboard/AlertStatusPanel';
import PriceChart from '@/components/dashboard/PriceChart';
import { StockWithCalculations, IAlert, IStock } from '@/types';
import { enrichStockWithCalculations } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [stocks, setStocks] = useState<StockWithCalculations[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [stocksRes, alertsRes] = await Promise.all([
        fetch('/api/stocks'),
        fetch('/api/alerts'),
      ]);

      const stocksData: IStock[] = await stocksRes.json();
      const alertsData: IAlert[] = await alertsRes.json();

      // Fetch prices for all stocks
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
          const enrichedStocks = stocksData.map((stock) =>
            enrichStockWithCalculations(stock)
          );
          setStocks(enrichedStocks);
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
    <div>
      <Header title="投資組合總覽" subtitle="即時監控你的股票投資" onRefresh={fetchData} />
      <div className="p-6 space-y-6">
        <PortfolioSummary stocks={stocks} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">持股一覽</h2>
            {stocks.length === 0 ? (
              <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-gray-400 text-lg">尚未新增任何持股</p>
                <p className="text-gray-400 text-sm mt-1">前往「持股管理」開始記錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {stocks.map((stock) => (
                  <StockCard key={stock._id} stock={stock} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <PriceChart stocks={stocks} />
            <AlertStatusPanel alerts={alerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
