'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { CheckCircle2, Send, AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import EmailSettings from '@/components/settings/EmailSettings';
import LineSettings from '@/components/settings/LineSettings';
import { INotificationConfig } from '@/types';

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
      <Center h="100vh">
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <div>
      <Header title="通知設定" subtitle="管理 Email 和 LINE 通知" />

      <Stack p={{ base: 'md', sm: 'xl' }} gap="lg">
        {saveMessage && (
          <Alert color="teal" variant="light" icon={<CheckCircle2 size={16} />}>
            {saveMessage}
          </Alert>
        )}

        <EmailSettings config={config.email} onSave={handleSaveEmail} />
        <LineSettings config={config.line} onSave={handleSaveLine} />

        <Card withBorder radius="lg" p="lg">
          <Group gap="sm" mb="md">
            <ThemeIcon color="yellow" variant="light" size="lg" radius="md">
              <Send size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="lg">測試通知</Text>
              <Text size="sm" c="dimmed">發送測試訊息確認設定是否正確</Text>
            </div>
          </Group>

          <Group gap="sm">
            <Button
              color="green"
              leftSection={<Send size={16} />}
              loading={isTesting === 'line'}
              disabled={isTesting !== null && isTesting !== 'line'}
              onClick={() => handleTestNotification('line')}
            >
              測試 LINE 通知
            </Button>
            <Button
              color="blue"
              leftSection={<Send size={16} />}
              loading={isTesting === 'email'}
              disabled={isTesting !== null && isTesting !== 'email'}
              onClick={() => handleTestNotification('email')}
            >
              測試 Email 通知
            </Button>
          </Group>

          {testResults.length > 0 && (
            <Stack gap="xs" mt="md">
              {testResults.map((result, i) => (
                <Alert
                  key={i}
                  color={result.success ? 'teal' : 'red'}
                  variant="light"
                  icon={result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  py="xs"
                >
                  <Text size="sm">
                    {result.channel === 'line' ? 'LINE' : 'Email'}：
                    {result.success ? '發送成功！請檢查是否收到訊息。' : result.error}
                  </Text>
                </Alert>
              ))}
            </Stack>
          )}
        </Card>

        <Paper p="lg" radius="lg" bg="var(--mantine-color-default-hover)">
          <Title order={5} mb="sm">使用說明</Title>
          <Stack gap="sm">
            <div>
              <Text size="sm" fw={500}>Email 通知</Text>
              <Text size="sm" c="dimmed">
                使用 SMTP 伺服器發送郵件。如果使用 Gmail，請在 Google 帳戶設定中產生「應用程式密碼」。
              </Text>
            </div>
            <div>
              <Text size="sm" fw={500}>LINE 通知</Text>
              <Text size="sm" c="dimmed">
                需要在 LINE Developers Console 建立 Messaging API Channel。將 Channel Access Token 和 Channel Secret 填入上方欄位，並輸入要接收通知的使用者 LINE User ID。
              </Text>
            </div>
          </Stack>
        </Paper>
      </Stack>
    </div>
  );
}
