'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export default function Header({ title, subtitle, onRefresh }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6 dark:border-gray-800 dark:bg-gray-900/80">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl dark:text-white">{title}</h1>
        {subtitle && <p className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">{subtitle}</p>}
      </div>
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-3 flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 sm:px-4 sm:text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">重新整理</span>
        </button>
      )}
    </header>
  );
}
