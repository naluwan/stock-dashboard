'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
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
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="lg" wrap="nowrap">
        <Group gap="sm">
          <ThemeIcon color="green" variant="light" size="lg" radius="md">
            <MessageCircle size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">LINE 通知設定</Text>
            <Text size="sm" c="dimmed">設定 LINE Messaging API</Text>
          </div>
        </Group>
        <Switch
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.currentTarget.checked })}
          color="teal"
        />
      </Group>

      <Stack gap="md">
        <PasswordInput
          label="Channel Access Token"
          placeholder="你的 LINE Channel Access Token"
          value={config.channelAccessToken}
          onChange={(e) => setConfig({ ...config, channelAccessToken: e.currentTarget.value })}
        />
        <PasswordInput
          label="Channel Secret"
          placeholder="你的 LINE Channel Secret"
          value={config.channelSecret}
          onChange={(e) => setConfig({ ...config, channelSecret: e.currentTarget.value })}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>LINE 接收者</Text>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <TextInput
              w={{ base: '30%', sm: 140 }}
              placeholder="名稱"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.currentTarget.value)}
            />
            <TextInput
              flex={1}
              placeholder="LINE User ID"
              value={newUserId}
              onChange={(e) => setNewUserId(e.currentTarget.value)}
            />
            <ActionIcon size="lg" color="green" onClick={addRecipient} variant="filled">
              <Plus size={16} />
            </ActionIcon>
          </Group>
          {config.recipients.length > 0 && (
            <Stack gap="xs" mt="xs">
              {config.recipients.map((recipient) => (
                <Paper
                  key={recipient.userId}
                  p="xs"
                  radius="md"
                  bg="var(--mantine-color-green-light)"
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} c="green">{recipient.displayName}</Text>
                      <Text size="xs" c="dimmed" truncate>{recipient.userId}</Text>
                    </div>
                    <ActionIcon
                      color="green"
                      variant="subtle"
                      onClick={() => removeRecipient(recipient.userId)}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </div>
      </Stack>

      <Button
        mt="lg"
        color="teal"
        leftSection={<Save size={16} />}
        loading={isSaving}
        onClick={handleSave}
      >
        儲存設定
      </Button>
    </Card>
  );
}
