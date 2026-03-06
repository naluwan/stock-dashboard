'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, MessageCircle } from 'lucide-react';
import { LineRecipient } from '@/types';

interface LineSettingsProps {
  config: {
    enabled: boolean;
    channelAccessToken: string;
    channelSecret: string;
    recipients: LineRecipient[];
  };
  onSave: (config: LineSettingsProps['config']) => Promise<void>;
}

export default function LineSettings({ config: initialConfig, onSave }: LineSettingsProps) {
  const [config, setConfig] = useState(initialConfig);
  const [newUserId, setNewUserId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addRecipient = () => {
    if (newUserId && newDisplayName) {
      setConfig({
        ...config,
        recipients: [...config.recipients, { userId: newUserId, displayName: newDisplayName }],
      });
      setNewUserId('');
      setNewDisplayName('');
    }
  };

  const removeRecipient = (userId: string) => {
    setConfig({ ...config, recipients: config.recipients.filter((r) => r.userId !== userId) });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-50 p-2 dark:bg-green-900/20">
            <MessageCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">LINE 通知設定</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">設定 LINE Messaging API</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel Access Token</label>
          <input
            type="password"
            value={config.channelAccessToken}
            onChange={(e) => setConfig({ ...config, channelAccessToken: e.target.value })}
            placeholder="你的 LINE Channel Access Token"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel Secret</label>
          <input
            type="password"
            value={config.channelSecret}
            onChange={(e) => setConfig({ ...config, channelSecret: e.target.value })}
            placeholder="你的 LINE Channel Secret"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LINE 接收者</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="名稱"
              className="w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="LINE User ID"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addRecipient}
              className="rounded-lg bg-green-500 px-3 py-2 text-white hover:bg-green-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {config.recipients.map((recipient) => (
              <div key={recipient.userId} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">{recipient.displayName}</p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">{recipient.userId}</p>
                </div>
                <button onClick={() => removeRecipient(recipient.userId)} className="text-green-400 hover:text-green-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isSaving ? '儲存中...' : '儲存設定'}
      </button>
    </div>
  );
}
