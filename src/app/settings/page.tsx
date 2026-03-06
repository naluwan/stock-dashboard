'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import EmailSettings from '@/components/settings/EmailSettings';
import LineSettings from '@/components/settings/LineSettings';
import { INotificationConfig } from '@/types';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<INotificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

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
