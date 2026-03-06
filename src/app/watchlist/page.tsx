'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Market, PriceData } from '@/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  DollarSign,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FavoriteItem {
  _id: string;
  symbol: string;
  name: string;
  market: Market;
  addedAt: string;
  sortOrder?: number;
}

interface FavoriteWithPrice extends FavoriteItem {
  price?: PriceData;
}

/* ─── Sortable Card (手機版) ─── */
function SortableCard({
  item,
  usdRate,
  onRemove,
}: {
  item: FavoriteWithPrice;
  usdRate: number;
  onRemove: (symbol: string, market: Market) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  const price = item.price;
  const isUp = (price?.change || 0) >= 0;
  const isUS = item.market === 'US';
  const colorClass = isUp
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl bg-white p-4 shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${
        isDragging ? 'ring-2 ring-emerald-400/50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
            aria-label="拖拉排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              item.market === 'TW'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
            }`}
          >
            {item.market}
          </span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.symbol}</p>
            <p className="text-xs text-gray-400">{item.name}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(item.symbol, item.market)}
          className="rounded-full p-1 text-yellow-500 hover:text-red-500 transition-colors"
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
      </div>
      {price && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-gray-400">現價</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(price.currentPrice, item.market)}
            </p>
            {isUS && usdRate > 0 && (
              <p className="text-[10px] text-gray-400">
                ≈ NT$ {formatNumber(price.currentPrice * usdRate, 0)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-gray-400">漲跌</p>
            <p className={`font-semibold ${colorClass}`}>
              {isUp ? '+' : ''}
              {price.change.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">漲跌幅</p>
            <p className={`font-semibold ${colorClass}`}>{formatPercent(price.changePercent)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sortable Table Row (桌面版) ─── */
function SortableTableRow({
  item,
  usdRate,
  onRemove,
}: {
  item: FavoriteWithPrice;
  usdRate: number;
  onRemove: (symbol: string, market: Market) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  const price = item.price;
  const isUp = (price?.change || 0) >= 0;
  const isUS = item.market === 'US';
  const colorClass = isUp
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
        isDragging ? 'bg-emerald-50 shadow-lg dark:bg-emerald-900/20' : ''
      }`}
    >
      <td className="w-8 px-1 py-3 sm:px-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
          aria-label="拖拉排序"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              item.market === 'TW'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
            }`}
          >
            {item.market}
          </span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.symbol}</p>
            <p className="text-xs text-gray-400">{item.name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-medium text-gray-900 dark:text-white">
          {price ? formatCurrency(price.currentPrice, item.market) : '—'}
        </span>
        {isUS && price && usdRate > 0 && (
          <span className="block text-[10px] text-gray-400">
            ≈ NT$ {formatNumber(price.currentPrice * usdRate, 2)}
          </span>
        )}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${colorClass}`}>
        {price ? (
          <span className="flex items-center justify-end gap-1">
            {isUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {isUp ? '+' : ''}
            {price.change.toFixed(2)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${colorClass}`}>
        {price ? `${isUp ? '+' : ''}${formatPercent(price.changePercent)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
        {price ? formatCurrency(price.high, item.market) : '—'}
      </td>
      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
        {price ? formatCurrency(price.low, item.market) : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onRemove(item.symbol, item.market)}
          className="rounded-full p-1 text-yellow-500 hover:text-red-500 transition-colors"
          title="移除自選"
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
      </td>
    </tr>
  );
}

/* ─── Main Page ─── */
export default function WatchlistPage() {
  const [favorites, setFavorites] = useState<FavoriteWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usdRate, setUsdRate] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadFavorites = useCallback(async () => {
    try {
      const [res, rateRes] = await Promise.all([
        fetch('/api/favorites'),
        fetch('/api/exchange-rate'),
      ]);

      try {
        const rateData = await rateRes.json();
        setUsdRate(rateData.rate || 0);
      } catch {
        /* ignore */
      }

      if (res.ok) {
        const data: FavoriteItem[] = await res.json();
        setFavorites(data.map((f) => ({ ...f })));
        fetchPrices(data);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPrices = async (items: FavoriteItem[]) => {
    setIsRefreshing(true);
    const updated: FavoriteWithPrice[] = [...items];

    const promises = items.map(async (item, index) => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(item.symbol)}&market=${item.market}&action=quote`
        );
        if (res.ok) {
          const price: PriceData = await res.json();
          updated[index] = { ...updated[index], price };
        }
      } catch {
        /* ignore */
      }
    });

    await Promise.all(promises);
    setFavorites([...updated]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const removeFavorite = async (symbol: string, market: Market) => {
    try {
      await fetch(`/api/favorites?symbol=${encodeURIComponent(symbol)}&market=${market}`, {
        method: 'DELETE',
      });
      setFavorites((prev) => prev.filter((f) => !(f.symbol === symbol && f.market === market)));
    } catch {
      /* ignore */
    }
  };

  const handleRefresh = () => {
    fetchPrices(favorites);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = favorites.findIndex((f) => f._id === active.id);
    const newIndex = favorites.findIndex((f) => f._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const reordered = arrayMove(favorites, oldIndex, newIndex);
    setFavorites(reordered);

    // Persist to DB
    try {
      const orderedIds = reordered.map((f) => f._id);
      await fetch('/api/favorites/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (error) {
      console.error('Failed to save order:', error);
      setFavorites(arrayMove(reordered, newIndex, oldIndex));
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="自選股票" subtitle="追蹤你關注的股票" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  const sortableIds = favorites.map((f) => f._id);

  return (
    <div>
      <Header
        title="自選股票"
        subtitle={`共 ${favorites.length} 檔自選股票`}
        onRefresh={handleRefresh}
      />

      <div className="p-4 sm:p-6">
        {usdRate > 0 && (
          <div className="mb-3 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <DollarSign className="h-3 w-3" />
            USD/TWD = {usdRate.toFixed(2)}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm border border-gray-200 sm:p-16 dark:bg-gray-800 dark:border-gray-700">
            <Star className="mx-auto h-10 w-10 text-gray-300 sm:h-12 sm:w-12 dark:text-gray-600" />
            <p className="mt-3 text-gray-400 text-base sm:text-lg">尚無自選股票</p>
            <p className="text-gray-400 text-xs mt-1 sm:text-sm">
              在股票搜尋頁面點擊星號即可加入自選
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3">
              {isRefreshing && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  正在更新報價...
                </div>
              )}

              {/* 手機版：卡片布局 */}
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 md:hidden">
                  {favorites.map((item) => (
                    <SortableCard
                      key={item._id}
                      item={item}
                      usdRate={usdRate}
                      onRemove={removeFavorite}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* 桌面版：表格布局 */}
              <div className="hidden md:block rounded-xl bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="w-8 px-1 py-3 sm:px-2"></th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                          股票
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                          現價
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                          漲跌
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                          漲跌幅
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                          最高
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                          最低
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={sortableIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {favorites.map((item) => (
                          <SortableTableRow
                            key={item._id}
                            item={item}
                            usdRate={usdRate}
                            onRemove={removeFavorite}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </table>
                </div>
              </div>
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}
