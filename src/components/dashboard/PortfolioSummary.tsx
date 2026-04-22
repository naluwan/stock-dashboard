'use client';

import { TrendingUp, TrendingDown, DollarSign, BarChart3, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatNumber, formatPercent, calculateRealizedPL } from '@/lib/utils';

interface PortfolioSummaryProps {
  stocks: StockWithCalculations[];
  usdRate?: number;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
}

const MASK = '＊＊＊＊';

export default function PortfolioSummary({ stocks, usdRate = 0, privacyMode, onTogglePrivacy }: PortfolioSummaryProps) {
  // 台股直接用 TWD，美股乘匯率換成 TWD（僅用於市值和損益）
  const toTWD = (amount: number, market: string) =>
    market === 'US' && usdRate > 0 ? amount * usdRate : amount;

  // 投入成本：分 TWD / USD 各自加總，不做匯率轉換
  const twCost = stocks.filter(s => s.market === 'TW').reduce((sum, s) => sum + s.totalCost, 0);
  const usCost = stocks.filter(s => s.market === 'US').reduce((sum, s) => sum + s.totalCost, 0);

  // 用每筆購買紀錄的匯率計算美股的台幣成本（含手續費）
  const usCostTWD = stocks.filter(s => s.market === 'US').reduce((sum, s) => {
    return sum + s.purchases.reduce((pSum, p) => {
      const rate = p.exchangeRate || usdRate;
      return pSum + (p.shares * p.price + (p.commission || 0)) * rate;
    }, 0);
  }, 0);

  // 市值 & 損益：統一換算成 TWD
  const totalValue = stocks.reduce((sum, s) => sum + toTWD(s.totalValue || 0, s.market), 0);
  const totalCostTWD = twCost + usCostTWD;
  const totalProfit = totalValue - totalCostTWD;
  const totalProfitPercent = totalCostTWD > 0 ? ((totalValue - totalCostTWD) / totalCostTWD) * 100 : 0;
  const stockCount = stocks.length;

  // 損益拆分：股價損益 vs 匯率損益
  // 股價損益(TWD) = Σ (currentPrice - avgPrice) * totalShares * currentRate（美股）或直接 TWD（台股）
  const stockPricePL = stocks.reduce((sum, s) => {
    if (s.currentPrice === undefined) return sum;
    const pl = (s.currentPrice - s.averagePrice) * s.totalShares;
    return sum + (s.market === 'US' && usdRate > 0 ? pl * usdRate : pl);
  }, 0);
  // 匯率損益(TWD) = Σ 每筆美股購買: (shares * price + commission) * (currentRate - purchaseRate)
  const fxPL = stocks.filter(s => s.market === 'US').reduce((sum, s) => {
    return sum + s.purchases.reduce((pSum, p) => {
      const purchaseRate = p.exchangeRate || usdRate;
      return pSum + (p.shares * p.price + (p.commission || 0)) * (usdRate - purchaseRate);
    }, 0);
  }, 0);

  // 投入成本顯示：統一換算台幣
  const costDisplay = () => `NT$ ${formatNumber(totalCostTWD, 0)}`;

  const stockPricePLPercent = totalCostTWD > 0 ? (stockPricePL / totalCostTWD) * 100 : 0;
  const fxPLPercent = totalCostTWD > 0 ? (fxPL / totalCostTWD) * 100 : 0;

  // 已實現損益（所有年度）
  const totalRealizedPL = stocks.reduce((sum, s) => {
    const pl = calculateRealizedPL(s.sales || []);
    return sum + (s.market === 'US' && usdRate > 0 ? pl * usdRate : pl);
  }, 0);

  // 加權平均買入匯率 = 美股台幣總成本 / 美股美元總成本
  const avgPurchaseRate = usCost > 0 ? usCostTWD / usCost : 0;

  const cards = [
    // 第一排
    {
      title: '總投入成本',
      value: costDisplay(),
      icon: DollarSign,
      lightColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      sensitive: true,
    },
    {
      title: '目前總市值',
      value: `NT$ ${formatNumber(totalValue, 0)}`,
      icon: BarChart3,
      lightColor: 'bg-purple-50 dark:bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
      sensitive: true,
    },
    {
      title: '持股數量',
      value: `${stockCount} 檔`,
      icon: BarChart3,
      lightColor: 'bg-amber-50 dark:bg-amber-500/10',
      textColor: 'text-amber-600 dark:text-amber-400',
      sensitive: false,
    },
    // 第二排
    {
      title: '股價損益',
      value: `NT$ ${formatNumber(stockPricePL, 0)}`,
      subtitle: formatPercent(stockPricePLPercent),
      icon: stockPricePL >= 0 ? TrendingUp : TrendingDown,
      lightColor: stockPricePL >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10',
      textColor: stockPricePL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      sensitive: true,
    },
    {
      title: '匯率損益',
      value: `NT$ ${formatNumber(fxPL, 0)}`,
      subtitle: formatPercent(fxPLPercent),
      extra: avgPurchaseRate > 0 ? `平均成本 ${avgPurchaseRate.toFixed(2)} → 目前 ${usdRate.toFixed(2)}` : undefined,
      icon: fxPL >= 0 ? TrendingUp : TrendingDown,
      lightColor: fxPL >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10',
      textColor: fxPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      sensitive: true,
    },
    {
      title: '未實現損益',
      value: `NT$ ${formatNumber(totalProfit, 0)}`,
      subtitle: formatPercent(totalProfitPercent),
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      lightColor: totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10',
      textColor: totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      sensitive: true,
    },
    // 第三排
    {
      title: '已實現損益',
      value: `NT$ ${formatNumber(totalRealizedPL, 0)}`,
      icon: totalRealizedPL >= 0 ? CheckCircle : TrendingDown,
      lightColor: totalRealizedPL >= 0 ? 'bg-teal-50 dark:bg-teal-500/10' : 'bg-red-50 dark:bg-red-500/10',
      textColor: totalRealizedPL >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400',
      sensitive: true,
    },
  ];

  return (
    <div className="space-y-2">
      {/* 隱私切換 */}
      <div className="flex justify-end">
        <button
          onClick={onTogglePrivacy}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {privacyMode ? '顯示金額' : '隱藏金額'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const showMask = privacyMode && card.sensitive;
          return (
            <div
              key={card.title}
              className="rounded-xl bg-white p-3 shadow-sm border border-gray-200 sm:p-5 dark:bg-gray-800 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">{card.title}</p>
                  <p className={`mt-0.5 truncate text-lg font-bold sm:mt-1 sm:text-2xl ${card.textColor}`}>
                    {showMask ? MASK : card.value}
                  </p>
                  {card.subtitle && (
                    <p className={`text-xs font-medium sm:text-sm ${card.textColor}`}>
                      {showMask ? '' : card.subtitle}
                    </p>
                  )}
                  {card.extra && !showMask && (
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                      {card.extra}
                    </p>
                  )}
                </div>
                <div className={`hidden rounded-xl p-3 sm:block ${card.lightColor}`}>
                  <Icon className={`h-6 w-6 ${card.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
