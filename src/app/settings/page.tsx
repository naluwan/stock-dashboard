'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import EmailSettings from '@/components/settings/EmailSettings';
import LineSettings from '@/components/settings/LineSettings';
import { INotificationConfig } from '@/types';
import { Loader2, CheckCircle2, Send, AlertCircle } from 'lucide-react';

interface TestResult {
  channel: string;
  success: boolean;
  error?: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<INotificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const showSaveSuccess = () => {
    setSaveMessage('設定已儲存成功！');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSaveEmail = async (emailConfig: INotificationConfig['email']) => {
    const res = await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailConfig }),
    });

    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      showSaveSuccess();
    }
  };

  const handleSaveLine = async (lineConfig: INotificationConfig['line']) => {
    const res = await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: lineConfig }),
    });

    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      showSaveSuccess();
    }
  };

  const handleTestNotification = async (channel: 'email' | 'line') => {
    setIsTesting(channel);
    setTestResults([]);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
      } else if (data.error) {
        setTestResults([{ channel, success: false, error: data.error }]);
      }
    } catch {
      setTestResults([{ channel, success: false, error: '發送請求失敗' }]);
    } finally {
      setIsTesting(null);
      setTimeout(() => setTestResults([]), 8000);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div>
      <Header title="通知設定" subtitle="管理 Email 和 LINE 通知" />

      {saveMessage && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          {saveMessage}
        </div>
      )}

      <div className="p-6 space-y-6">
        <EmailSettings config={config.email} onSave={handleSaveEmail} />
        <LineSettings config={config.line} onSave={handleSaveLine} />

        {/* 測試發送區塊 */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
              <Send className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">測試通知</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">發送測試訊息確認設定是否正確</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleTestNotification('line')}
              disabled={isTesting !== null}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isTesting === 'line' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              測試 LINE 通知
            </button>
            <button
              onClick={() => handleTestNotification('email')}
              disabled={isTesting !== null}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isTesting === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              測試 Email 通知
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {testResults.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                    result.success
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {result.channel === 'line' ? 'LINE' : 'Email'}：
                    {result.success ? '發送成功！請檢查是否收到訊息。' : result.error}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gray-50 p-6 dark:bg-gray-800/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">使用說明</h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Email 通知</p>
              <p>使用 SMTP 伺服器發送郵件。如果使用 Gmail，請在 Google 帳戶設定中產生「應用程式密碼」。</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">LINE 通知</p>
              <p>需要在 LINE Developers Console 建立 Messaging API Channel。將 Channel Access Token 和 Channel Secret 填入上方欄位，並輸入要接收通知的使用者 LINE User ID。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
