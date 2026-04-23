'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  PasswordInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { Plus, Trash2, Save, Mail } from 'lucide-react';

interface EmailSettingsProps {
  config: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    recipients: string[];
  };
  onSave: (config: EmailSettingsProps['config']) => Promise<void>;
}

export default function EmailSettings({ config: initialConfig, onSave }: EmailSettingsProps) {
  const [config, setConfig] = useState(initialConfig);
  const [newRecipient, setNewRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      setConfig({ ...config, recipients: [...config.recipients, newRecipient] });
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setConfig({ ...config, recipients: config.recipients.filter((r) => r !== email) });
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
          <ThemeIcon color="blue" variant="light" size="lg" radius="md">
            <Mail size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">Email 通知設定</Text>
            <Text size="sm" c="dimmed">設定 SMTP 伺服器和收件人</Text>
          </div>
        </Group>
        <Switch
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.currentTarget.checked })}
          color="teal"
        />
      </Group>

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="SMTP 伺服器"
            placeholder="smtp.gmail.com"
            value={config.smtpHost}
            onChange={(e) => setConfig({ ...config, smtpHost: e.currentTarget.value })}
          />
          <NumberInput
            label="SMTP 連接埠"
            value={config.smtpPort}
            onChange={(v) => setConfig({ ...config, smtpPort: typeof v === 'number' ? v : 587 })}
            min={1}
            max={65535}
            hideControls
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="帳號"
            placeholder="your-email@gmail.com"
            value={config.smtpUser}
            onChange={(e) => setConfig({ ...config, smtpUser: e.currentTarget.value })}
          />
          <PasswordInput
            label="密碼 / 應用程式密碼"
            placeholder="••••••••"
            value={config.smtpPass}
            onChange={(e) => setConfig({ ...config, smtpPass: e.currentTarget.value })}
          />
        </SimpleGrid>

        <div>
          <Text size="sm" fw={500} mb={6}>收件人</Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              flex={1}
              type="email"
              placeholder="email@example.com"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRecipient();
                }
              }}
            />
            <ActionIcon size="lg" color="blue" onClick={addRecipient} variant="filled">
              <Plus size={16} />
            </ActionIcon>
          </Group>
          {config.recipients.length > 0 && (
            <Group gap="xs" mt="xs">
              {config.recipients.map((email) => (
                <Badge
                  key={email}
                  size="lg"
                  variant="light"
                  color="blue"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      color="blue"
                      variant="transparent"
                      onClick={() => removeRecipient(email)}
                    >
                      <Trash2 size={12} />
                    </ActionIcon>
                  }
                  pr={4}
                >
                  {email}
                </Badge>
              ))}
            </Group>
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
