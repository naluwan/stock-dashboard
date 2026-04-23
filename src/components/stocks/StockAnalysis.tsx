'use client';

import { useState } from 'react';
import { BrainCircuit, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface StockAnalysisProps {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
}

export default function StockAnalysis({ symbol, name, market }: StockAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch('/api/stocks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, name, market }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '分析失敗');
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (!analysis && !isLoading && !error) {
    return (
      <button
        onClick={handleAnalyze}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
      >
        <BrainCircuit className="h-3.5 w-3.5" />
        AI 策略分析
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30">
      {/* 標題列 */}
      <div className="flex items-center justify-between border-b border-indigo-200 px-4 py-2.5 dark:border-indigo-800">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            AI 策略分析 — {symbol} {name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <button
              onClick={handleAnalyze}
              className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium"
            >
              重新分析
            </button>
          )}
          <button
            onClick={() => { setAnalysis(null); setError(null); }}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 內容 */}
      <div className="p-4">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              正在分析 {symbol} 的技術指標...
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              計算 RSI、MACD、KD、布林通道等指標，約需 10-15 秒
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {analysis && (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-table:text-xs prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-td:border prose-th:border prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-th:border-gray-200 dark:prose-th:border-gray-700">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
