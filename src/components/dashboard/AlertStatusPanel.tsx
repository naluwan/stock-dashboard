'use client';

import { Alert, Card, Group, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { IAlert } from '@/types';

interface AlertStatusPanelProps {
  alerts: IAlert[];
}

const typeLabels: Record<string, string> = {
  above_price: '高於價格',
  below_price: '低於價格',
  above_avg_percent: '高於均價%',
  below_avg_percent: '低於均價%',
};

export default function AlertStatusPanel({ alerts }: AlertStatusPanelProps) {
  const activeAlerts = alerts.filter((a) => a.isActive);
  const recentTriggered = alerts.filter(
    (a) => a.lastTriggered && new Date(a.lastTriggered).getTime() > Date.now() - 24 * 60 * 60 * 1000,
  );

  return (
    <Card withBorder radius="lg" p="md">
      <Group justify="space-between" mb="md">
        <Title order={5}>價格警報</Title>
        <Group gap={4}>
          <Bell size={14} color="var(--mantine-color-dimmed)" />
          <Text size="sm" c="dimmed">{activeAlerts.length} 個啟用中</Text>
        </Group>
      </Group>

      {recentTriggered.length > 0 && (
        <Alert
          mb="sm"
          color="yellow"
          variant="light"
          icon={<AlertTriangle size={16} />}
          py="xs"
        >
          <Text size="sm" fw={500}>
            過去 24 小時有 {recentTriggered.length} 個警報被觸發
          </Text>
        </Alert>
      )}

      <ScrollArea.Autosize mah={260}>
        {alerts.length === 0 ? (
          <Text ta="center" size="sm" c="dimmed" py="md">尚未設定任何警報</Text>
        ) : (
          <Stack gap="xs">
            {alerts.slice(0, 5).map((alert) => (
              <Paper
                key={alert._id}
                p="xs"
                radius="md"
                bg="var(--mantine-color-default-hover)"
                opacity={alert.isActive ? 1 : 0.5}
              >
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {alert.stockName} ({alert.stockSymbol})
                    </Text>
                    <Text size="xs" c="dimmed">
                      {typeLabels[alert.type]} {alert.targetValue}
                    </Text>
                  </div>
                  {alert.isActive
                    ? <Bell size={16} color="var(--mantine-color-teal-6)" />
                    : <BellOff size={16} color="var(--mantine-color-dimmed)" />
                  }
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </Card>
  );
}
