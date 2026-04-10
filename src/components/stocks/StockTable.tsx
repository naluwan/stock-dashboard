'use client';

import { useState } from 'react';
import { Edit2, Trash2, TrendingUp, TrendingDown, GripVertical, ChevronDown, ArrowDownToLine, History } from 'lucide-react';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatAmount, formatPercent, formatNumber, formatShares } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import StockPriceChart from '@/components/dashboard/StockPriceChart';

interface StockTableProps {
  stocks: StockWithCalculations[];
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
  usdRate?: number;
  privacyMode?: boolean;
}

const MASK = '＊＊＊＊';

function TWDSub({ usd, rate }: { usd: number; rate: number }) {
  if (rate <= 0) return null;
  return (
    <span className="block text-[10px] text-gray-400">
      ≈ NT$ {formatNumber(usd * rate, 0)}
    </span>
  );
}

/* ─── 手機版：卡片 ─── */
function SortableCard({
  stock, onEdit, onDelete, onSell, onViewHistory, usdRate, privacyMode, isExpanded, onToggleExpand,
}: {
  stock: StockWithCalculations;
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
  usdRate: number;
  privacyMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock._id! });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative' as const };
  const isProfit = (stock.totalProfit || 0) >= 0;
  const isUS = stock.market === 'US';

  const twdCost = isUS
    ? stock.purchases.reduce((sum, p) => sum + p.shares * p.price * (p.exchangeRate || usdRate), 0)
    : 0;

  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${isDragging ? 'shadow-lg ring-2 ring-emerald-500/30' : ''}`}>
      <div className="p-4">
        {/* 頂部：拖拉 + 股票名稱 + 操作按鈕 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-0.5 text-gray-300 active:cursor-grabbing dark:text-gray-600" aria-label="拖拉排序">
              <GripVertical className="h-4 w-4" />
            </button>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              stock.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
            }`}>
              {stock.market}
            </span>
            <button onClick={onToggleExpand} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
              <span className="font-bold text-gray-900 dark:text-white">{stock.symbol}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{stock.name}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            {stock.totalShares > 0 && (
              <button onClick={() => onSell(stock)} className="rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/30" title="賣出">
                <ArrowDownToLine className="h-4 w-4" />
              </button>
            )}
            {(stock.sales && stock.sales.length > 0) && (
              <button onClick={() => onViewHistory(stock)} className="rounded-lg p-1.5 text-gray-400 hover:bg-teal-50 hover:text-teal-500 dark:hover:bg-teal-900/30" title="賣出歷史">
                <History className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => onEdit(stock)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30">
              <Edit2 className="h-4 w-4" />
            </button>
            <button onClick={() => stock._id && onDelete(stock._id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 損益 badge */}
        <div className={`mb-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
          isProfit ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {privacyMode ? (
            <span>{MASK}</span>
          ) : (
            <>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{stock.totalProfit !== undefined ? formatAmount(stock.totalProfit, stock.market) : '-'}</span>
              <span className="text-xs">({formatPercent(stock.totalProfitPercent || 0)})</span>
              {isUS && stock.totalProfit !== undefined && usdRate > 0 && (
                <span className="text-[10px] text-gray-400 ml-auto">≈ NT$ {formatNumber(stock.totalProfit * usdRate, 0)}</span>
              )}
            </>
          )}
        </div>

        {/* 資訊格 2x3 */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
          <div>
            <p className="text-gray-400 dark:text-gray-500">目前價格</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
            </p>
            {isUS && stock.currentPrice ? <TWDSub usd={stock.currentPrice} rate={usdRate} /> : null}
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500">平均成本</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stock.averagePrice, stock.market)}</p>
            {isUS ? <TWDSub usd={stock.averagePrice} rate={usdRate} /> : null}
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500">股數</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatShares(stock.totalShares, stock.market)}</p>
          </div>

          <div>
            <p className="text-gray-400 dark:text-gray-500">投入成本</p>
            {privacyMode ? <p className="font-semibold text-gray-400">{MASK}</p> : (
              <>
                <p className="font-semibold text-gray-900 dark:text-white">{formatAmount(stock.totalCost, stock.market)}</p>
                {isUS && twdCost > 0 && <span className="text-[10px] text-gray-400">≈ NT$ {formatNumber(twdCost, 0)}</span>}
              </>
            )}
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500">目前市值</p>
            {privacyMode ? <p className="font-semibold text-gray-400">{MASK}</p> : (
              <>
                <p className="font-semibold text-gray-900 dark:text-white">{stock.totalValue !== undefined ? formatAmount(stock.totalValue, stock.market) : '-'}</p>
                {isUS && stock.totalValue !== undefined ? <TWDSub usd={stock.totalValue} rate={usdRate} /> : null}
              </>
            )}
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500">未實現損益</p>
            {privacyMode ? <p className="font-semibold text-gray-400">{MASK}</p> : (
              <p className={`font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stock.totalProfit !== undefined ? formatAmount(stock.totalProfit, stock.market) : '-'}
              </p>
            )}
          </div>
          {(stock.realizedPL !== undefined && stock.realizedPL !== 0) && (
            <div>
              <p className="text-gray-400 dark:text-gray-500">已實現損益</p>
              {privacyMode ? <p className="font-semibold text-gray-400">{MASK}</p> : (
                <p className={`font-semibold ${stock.realizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatAmount(stock.realizedPL, stock.market)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 展開：走勢圖 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-gray-100 dark:border-gray-700 p-4">
          <StockPriceChart symbol={stock.symbol} market={stock.market} currentPrice={stock.currentPrice} />
        </div>
      </div>
    </div>
  );
}

/* ─── 桌面版：表格列 ─── */
function SortableRow({
  stock, onEdit, onDelete, onSell, onViewHistory, usdRate, privacyMode, isExpanded, onToggleExpand,
}: {
  stock: StockWithCalculations;
  onEdit: (stock: StockWithCalculations) => void;
  onDelete: (id: string) => void;
  onSell: (stock: StockWithCalculations) => void;
  onViewHistory: (stock: StockWithCalculations) => void;
  usdRate: number;
  privacyMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock._id! });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined, position: 'relative' as const };
  const isProfit = (stock.totalProfit || 0) >= 0;
  const isUS = stock.market === 'US';

  return (
    <>
      <tr ref={setNodeRef} style={style} className={`border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${isDragging ? 'bg-emerald-50 shadow-lg dark:bg-emerald-900/20' : ''}`}>
        <td className="w-8 px-2 py-3">
          <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400" aria-label="拖拉排序">
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
        <td className="px-4 py-3">
          <button onClick={onToggleExpand} className="flex items-center gap-2 hover:opacity-70 transition-opacity text-left">
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              stock.market === 'TW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
            }`}>{stock.market}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{stock.symbol}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stock.name}</p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-medium text-gray-900 dark:text-white">{stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}</span>
          {isUS && stock.currentPrice ? <TWDSub usd={stock.currentPrice} rate={usdRate} /> : null}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(stock.averagePrice, stock.market)}</span>
          {isUS ? <TWDSub usd={stock.averagePrice} rate={usdRate} /> : null}
        </td>
        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatShares(stock.totalShares, stock.market)}</td>
        <td className="px-4 py-3 text-right">
          {privacyMode ? <span className="text-gray-400">{MASK}</span> : (
            <>
              <span className="text-gray-700 dark:text-gray-300">{formatAmount(stock.totalCost, stock.market)}</span>
              {isUS && (() => {
                const twdCost = stock.purchases.reduce((sum, p) => sum + p.shares * p.price * (p.exchangeRate || usdRate), 0);
                return twdCost > 0 ? <span className="block text-[10px] text-gray-400">≈ NT$ {formatNumber(twdCost, 0)}</span> : null;
              })()}
            </>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {privacyMode ? <span className="text-gray-400">{MASK}</span> : (
            <>
              <span className="text-gray-700 dark:text-gray-300">{stock.totalValue !== undefined ? formatAmount(stock.totalValue, stock.market) : '-'}</span>
              {isUS && stock.totalValue !== undefined ? <TWDSub usd={stock.totalValue} rate={usdRate} /> : null}
            </>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {privacyMode ? <span className="text-gray-400">{MASK}</span> : (
            <>
              <div className={`flex items-center justify-end gap-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isProfit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span className="font-medium">{stock.totalProfit !== undefined ? formatAmount(stock.totalProfit, stock.market) : '-'}</span>
                <span className="text-xs">({formatPercent(stock.totalProfitPercent || 0)})</span>
              </div>
              {isUS && stock.totalProfit !== undefined ? <TWDSub usd={stock.totalProfit} rate={usdRate} /> : null}
              {stock.realizedPL !== undefined && stock.realizedPL !== 0 && (
                <span className={`block text-[10px] mt-0.5 ${stock.realizedPL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  已實現 {formatAmount(stock.realizedPL, stock.market)}
                </span>
              )}
            </>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {stock.totalShares > 0 && (
              <button onClick={() => onSell(stock)} className="rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/30" title="賣出">
                <ArrowDownToLine className="h-4 w-4" />
              </button>
            )}
            {(stock.sales && stock.sales.length > 0) && (
              <button onClick={() => onViewHistory(stock)} className="rounded-lg p-1.5 text-gray-400 hover:bg-teal-50 hover:text-teal-500 dark:hover:bg-teal-900/30" title="賣出歷史">
                <History className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => onEdit(stock)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30">
              <Edit2 className="h-4 w-4" />
            </button>
            <button onClick={() => stock._id && onDelete(stock._id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {/* 展開：走勢圖 */}
      <tr className={`${isExpanded ? '' : 'hidden'}`}>
        <td colSpan={9} className="px-4 pb-4 pt-0">
          <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <StockPriceChart symbol={stock.symbol} market={stock.market} currentPrice={stock.currentPrice} />
          </div>
        </td>
      </tr>
    </>
  );
}

/* ─── 主元件 ─── */
export default function StockTable({ stocks, onEdit, onDelete, onSell, onViewHistory, usdRate = 0, privacyMode = false }: StockTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (stocks.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <p className="text-gray-400 text-lg">尚未新增任何持股</p>
        <p className="text-gray-400 text-sm mt-1">點擊「新增持股」開始記錄你的投資組合</p>
      </div>
    );
  }

  const sortableIds = stocks.map((s) => s._id!);

  return (
    <>
      {/* 手機版：卡片列表 */}
      <div className="space-y-3 lg:hidden">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {stocks.map((stock) => (
            <SortableCard
              key={stock._id}
              stock={stock}
              onEdit={onEdit}
              onDelete={onDelete}
              onSell={onSell}
              onViewHistory={onViewHistory}
              usdRate={usdRate}
              privacyMode={privacyMode}
              isExpanded={expandedId === stock._id}
              onToggleExpand={() => toggleExpand(stock._id!)}
            />
          ))}
        </SortableContext>
      </div>

      {/* 桌面版：表格 */}
      <div className="hidden lg:block overflow-x-auto rounded-xl bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="w-8 px-2 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">股票</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">目前價格</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">平均成本</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">股數</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">投入成本</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">目前市值</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">損益</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">操作</th>
            </tr>
          </thead>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <tbody>
              {stocks.map((stock) => (
                <SortableRow
                  key={stock._id}
                  stock={stock}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSell={onSell}
                  onViewHistory={onViewHistory}
                  usdRate={usdRate}
                  privacyMode={privacyMode}
                  isExpanded={expandedId === stock._id}
                  onToggleExpand={() => toggleExpand(stock._id!)}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>
    </>
  );
}
