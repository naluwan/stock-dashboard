'use client';

import { useState } from 'react';
import {
  Button,
  Chip,
  Group,
  NumberInput,
  Paper,
  Radio,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { AlertType, IStock, Market } from '@/types';

interface AlertFormProps {
  stocks: IStock[];
  onSubmit: (data: {
    stockSymbol: string;
    stockName: string;
    market: Market;
    type: AlertType;
    targetValue: number;
    maxTriggers: number;
    notifyChannels: ('email' | 'line')[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function AlertForm({ stocks, onSubmit, onCancel }: AlertFormProps) {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [type, setType] = useState<AlertType>('below_price');
  const [targetValue, setTargetValue] = useState<number | string>('');
  const [maxTriggers, setMaxTriggers] = useState<string>('0');
  const [channels, setChannels] = useState<string[]>(['email']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStockData = stocks.find((s) => `${s.market}_${s.symbol}` === selectedStock);

  const alertTypes: { value: AlertType; label: string; description: string }[] = [
    { value: 'below_price', label: '低於指定價格', description: '當股價低於設定的價格時通知' },
    { value: 'above_price', label: '高於指定價格', description: '當股價高於設定的價格時通知' },
    { value: 'below_avg_percent', label: '低於均價百分比', description: '當股價低於平均成本的某個百分比時通知' },
    { value: 'above_avg_percent', label: '高於均價百分比', description: '當股價高於平均成本的某個百分比時通知' },
  ];

  const triggerOptions = [
    { value: '0', label: '持續通知（不限次數）' },
    { value: '1', label: '只通知 1 次' },
    { value: '3', label: '最多通知 3 次' },
    { value: '5', label: '最多通知 5 次' },
    { value: '10', label: '最多通知 10 次' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockData) return;
    const val = typeof targetValue === 'number' ? targetValue : parseFloat(targetValue || '0');
    if (!val || val <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        stockSymbol: selectedStockData.symbol,
        stockName: selectedStockData.name,
        market: selectedStockData.market,
        type,
        targetValue: val,
        maxTriggers: parseInt(maxTriggers),
        notifyChannels: channels as ('email' | 'line')[],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Select
          label="選擇股票"
          placeholder="請選擇..."
          required
          data={stocks.map((s) => ({
            value: `${s.market}_${s.symbol}`,
            label: `[${s.market}] ${s.symbol} - ${s.name}`,
          }))}
          value={selectedStock}
          onChange={setSelectedStock}
          searchable
        />

        <div>
          <Text size="sm" fw={500} mb={6}>警報類型</Text>
          <Radio.Group value={type} onChange={(v) => setType(v as AlertType)}>
            <Stack gap="xs">
              {alertTypes.map((at) => (
                <Paper
                  key={at.value}
                  p="xs"
                  radius="md"
                  withBorder={type === at.value}
                  bg={type === at.value ? 'var(--mantine-color-teal-light)' : 'var(--mantine-color-default-hover)'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setType(at.value)}
                >
                  <Radio
                    value={at.value}
                    label={
                      <div>
                        <Text size="sm" fw={500}>{at.label}</Text>
                        <Text size="xs" c="dimmed">{at.description}</Text>
                      </div>
                    }
                  />
                </Paper>
              ))}
            </Stack>
          </Radio.Group>
        </div>

        <NumberInput
          label={type.includes('percent') ? '百分比 (%)' : '目標價格'}
          placeholder={type.includes('percent') ? '例: 10 (代表 10%)' : '例: 500'}
          value={targetValue}
          onChange={setTargetValue}
          min={0}
          decimalScale={type.includes('percent') ? 0 : 2}
          required
          hideControls
        />

        <Select
          label="觸發次數限制"
          data={triggerOptions}
          value={maxTriggers}
          onChange={(v) => setMaxTriggers(v || '0')}
          description={
            parseInt(maxTriggers) === 0
              ? '警報將持續觸發直到手動停用'
              : `達到 ${maxTriggers} 次後自動停用警報`
          }
          allowDeselect={false}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>通知管道</Text>
          <Chip.Group multiple value={channels} onChange={(v) => setChannels(v.length > 0 ? v : channels)}>
            <Group>
              <Chip value="email" color="blue">Email</Chip>
              <Chip value="line" color="green">LINE</Chip>
            </Group>
          </Chip.Group>
        </div>

        <Group grow>
          <Button variant="default" onClick={onCancel} type="button">取消</Button>
          <Button type="submit" color="teal" loading={isSubmitting} disabled={!selectedStock}>
            建立警報
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
