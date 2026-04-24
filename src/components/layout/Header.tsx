'use client';

import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  rightSection?: React.ReactNode;
}

export default function Header({ title, subtitle, onRefresh, rightSection }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px={{ base: 'md', sm: 'xl' }}
      py="md"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <Title
          order={3}
          fz={{ base: 'md', sm: 'lg' }}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {title}
        </Title>
        {subtitle && (
          <Text size="xs" c="dimmed" visibleFrom="sm">
            {subtitle}
          </Text>
        )}
      </Stack>
      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        {rightSection}
        {onRefresh && (
          <Button
            onClick={handleRefresh}
            loading={isRefreshing}
            leftSection={<RefreshCw size={16} />}
            size="sm"
            color="teal"
          >
            重新整理
          </Button>
        )}
      </Group>
    </Group>
  );
}
