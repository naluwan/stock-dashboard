'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { Bell, BellOff, Trash2, RotateCcw } from 'lucide-react';
import { IAlert } from '@/types';

interface AlertListProps {
  alerts: IAlert[];
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onResetCount?: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  above_price: '高於價格',
  below_price: '低於價格',
  above_avg_percent: '高於均價 %',
  below_avg_percent: '低於均價 %',
};

export default function AlertList({ alerts, onToggle, onDelete, onResetCount }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <Card withBorder radius="lg" p="xl">
        <Center>
          <Stack align="center" gap="xs">
            <Bell size={40} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed">尚未設定任何價格警報</Text>
            <Text c="dimmed" size="sm">設定警報以在股價達到目標時收到通知</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      {alerts.map((alert) => {
        const triggerCount = alert.triggerCount || 0;
        const maxTriggers = alert.maxTriggers || 0;
        const isMaxedOut = maxTriggers > 0 && triggerCount >= maxTriggers;

        return (
          <Card
            key={alert._id}
            withBorder
            radius="lg"
            p="sm"
            opacity={alert.isActive ? 1 : 0.6}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0, flex: 1 }}>
                <ThemeIcon
                  color={alert.isActive ? 'teal' : 'gray'}
                  variant="light"
                  size="lg"
                  radius="md"
                >
                  {alert.isActive ? <Bell size={18} /> : <BellOff size={18} />}
                </ThemeIcon>
                <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap="xs" wrap="wrap">
                    <Badge size="xs" color={alert.market === 'TW' ? 'blue' : 'violet'} variant="light">
                      {alert.market}
                    </Badge>
                    <Text size="sm" fw={500} truncate>
                      {alert.stockName} ({alert.stockSymbol})
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {typeLabels[alert.type]} {alert.targetValue}
                    {alert.type.includes('percent') ? '%' : ''}
                  </Text>
                  <Group gap={6} wrap="wrap">
                    {alert.notifyChannels.map((ch) => (
                      <Badge key={ch} size="xs" variant="default">
                        {ch === 'email' ? 'Email' : 'LINE'}
                      </Badge>
                    ))}
                    <Badge
                      size="xs"
                      variant="light"
                      color={isMaxedOut ? 'red' : 'gray'}
                    >
                      已觸發 {triggerCount}/{maxTriggers === 0 ? '∞' : maxTriggers} 次
                    </Badge>
                    {alert.lastTriggered && (
                      <Text size="10px" c="dimmed">
                        上次: {new Date(alert.lastTriggered).toLocaleString('zh-TW')}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Group>
              <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                {isMaxedOut && onResetCount && (
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => alert._id && onResetCount(alert._id)}
                    aria-label="重置觸發次數並重新啟用"
                  >
                    <RotateCcw size={16} />
                  </ActionIcon>
                )}
                <Button
                  size="compact-xs"
                  variant={alert.isActive ? 'light' : 'default'}
                  color={alert.isActive ? 'teal' : 'gray'}
                  onClick={() => alert._id && onToggle(alert._id, !alert.isActive)}
                >
                  {alert.isActive ? '啟用' : '停用'}
                </Button>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => alert._id && onDelete(alert._id)}
                  aria-label="刪除"
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
