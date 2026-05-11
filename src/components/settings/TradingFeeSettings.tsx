'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { Save, Percent } from 'lucide-react';
import { ITradingConfig } from '@/types';

interface TradingFeeSettingsProps {
  config: ITradingConfig;
  onSave: (config: ITradingConfig) => Promise<void>;
}

export default function TradingFeeSettings({ config: initialConfig, onSave }: TradingFeeSettingsProps) {
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

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
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon color="teal" variant="light" size={36} radius="md">
              <Percent size={18} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={600}>交易手續費</Text>
              <Text size="xs" c="dimmed">
                用於計算「假設現在賣出」要付的手續費，預估損益會跟券商對齊
              </Text>
            </Stack>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <NumberInput
            label="台股手續費率 (%)"
            description="法定上限 0.1425，券商常有折讓"
            value={config.twStockFeeRate}
            onChange={(v) => setConfig({ ...config, twStockFeeRate: typeof v === 'number' ? v : Number(v) || 0 })}
            min={0}
            max={1}
            step={0.0001}
            decimalScale={4}
          />
          <NumberInput
            label="台股最低手續費 (NT$)"
            description="不足會以此為下限收取"
            value={config.twStockMinFee}
            onChange={(v) => setConfig({ ...config, twStockMinFee: typeof v === 'number' ? v : Number(v) || 0 })}
            min={0}
            step={1}
          />
          <NumberInput
            label="美股手續費率 (%)"
            description="多數券商目前為 0"
            value={config.usStockFeeRate}
            onChange={(v) => setConfig({ ...config, usStockFeeRate: typeof v === 'number' ? v : Number(v) || 0 })}
            min={0}
            max={1}
            step={0.0001}
            decimalScale={4}
          />
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          證交稅由政府收取，固定為：台股個股 0.3%、ETF（00 開頭）0.1%、美股 0%（內建，不可調）
        </Text>

        <Group justify="flex-end">
          <Button
            leftSection={<Save size={16} />}
            onClick={handleSave}
            loading={isSaving}
            color="teal"
          >
            儲存
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
