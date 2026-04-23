'use client';

import { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { StockWithCalculations } from '@/types';
import { formatCurrency, formatAmount, formatShares } from '@/lib/utils';

interface SellStockFormProps {
  stock: StockWithCalculations;
  onSubmit: (data: {
    stockId: string;
    shares: number;
    price: number;
    date: string;
    note?: string;
    exchangeRate?: number;
    commission?: number;
    tax?: number;
  }) => Promise<void>;
  onCancel: () => void;
}

type NumValue = number | string;

const toNum = (v: NumValue): number => {
  if (v === '' || v === '-') return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export default function SellStockForm({ stock, onSubmit, onCancel }: SellStockFormProps) {
  const [sharesInput, setSharesInput] = useState<NumValue>('');
  const [priceInput, setPriceInput] = useState<NumValue>('');
  const [amountInput, setAmountInput] = useState<NumValue>('');
  const [dateInput, setDateInput] = useState<Date>(new Date());
  const [noteInput, setNoteInput] = useState('');
  const [rateInput, setRateInput] = useState<NumValue>('');
  const [commissionInput, setCommissionInput] = useState<NumValue>('');
  const [taxInput, setTaxInput] = useState<NumValue>('');
  const [currentUsdRate, setCurrentUsdRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUS = stock.market === 'US';

  useEffect(() => {
    if (isUS) {
      fetch('/api/exchange-rate')
        .then((res) => res.json())
        .then((data) => { if (data.rate) setCurrentUsdRate(data.rate); })
        .catch(() => {});
    }
  }, [isUS]);

  useEffect(() => {
    if (stock.currentPrice) {
      setPriceInput(stock.currentPrice);
    }
  }, [stock.currentPrice]);

  const handleSharesChange = (raw: NumValue) => {
    setSharesInput(raw);
    const shares = toNum(raw);
    const price = toNum(priceInput);
    if (price > 0 && shares > 0) {
      setAmountInput(round2(shares * price));
    }
  };

  const handlePriceChange = (raw: NumValue) => {
    setPriceInput(raw);
    const price = toNum(raw);
    const shares = toNum(sharesInput);
    if (shares > 0 && price > 0) {
      setAmountInput(round2(shares * price));
    }
  };

  const handleAmountChange = (raw: NumValue) => {
    setAmountInput(raw);
    const amount = toNum(raw);
    const price = toNum(priceInput);
    const shares = toNum(sharesInput);
    if (price > 0 && amount > 0) {
      setSharesInput(round2(amount / price));
    } else if (shares > 0 && amount > 0) {
      setPriceInput(round2(amount / shares));
    }
  };

  const sellAll = () => {
    setSharesInput(stock.totalShares);
    const price = toNum(priceInput);
    if (price > 0) {
      setAmountInput(round2(stock.totalShares * price));
    }
  };

  const shares = toNum(sharesInput);
  const commission = toNum(commissionInput);
  const tax = toNum(taxInput);
  const estimatedPL = shares > 0
    ? (toNum(priceInput) - stock.averagePrice) * shares - commission - tax
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shares <= 0 || shares > stock.totalShares) return;

    setIsSubmitting(true);
    try {
      const data: {
        stockId: string;
        shares: number;
        price: number;
        date: string;
        note?: string;
        exchangeRate?: number;
        commission?: number;
        tax?: number;
      } = {
        stockId: stock._id!,
        shares,
        price: toNum(priceInput),
        date: dateInput.toISOString().split('T')[0],
        note: noteInput || undefined,
        commission: commission > 0 ? commission : undefined,
        tax: tax > 0 ? tax : undefined,
      };

      if (isUS) {
        const rate = toNum(rateInput);
        data.exchangeRate = rate > 0 ? rate : currentUsdRate || undefined;
      }

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Paper p="sm" bg="var(--mantine-color-default-hover)" radius="md">
          <Group gap="xs" mb="xs">
            <Badge size="xs" color={stock.market === 'TW' ? 'blue' : 'violet'}>{stock.market}</Badge>
            <Text fw={700}>{stock.symbol}</Text>
            <Text size="sm" c="dimmed">{stock.name}</Text>
          </Group>
          <SimpleGrid cols={3} spacing="xs">
            <div>
              <Text size="xs" c="dimmed">持有股數</Text>
              <Text size="sm" fw={600}>{formatShares(stock.totalShares, stock.market)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">平均成本</Text>
              <Text size="sm" fw={600}>{formatCurrency(stock.averagePrice, stock.market)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">目前價格</Text>
              <Text size="sm" fw={600}>
                {stock.currentPrice ? formatCurrency(stock.currentPrice, stock.market) : '-'}
              </Text>
            </div>
          </SimpleGrid>
        </Paper>

        <Paper p="sm" bg="var(--mantine-color-default-hover)" radius="md">
          <Group justify="space-between" mb={8}>
            <Text size="xs" c="dimmed" fw={500}>賣出資訊</Text>
            <Button variant="subtle" size="compact-xs" color="teal" onClick={sellAll} type="button">
              全部賣出
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: isUS ? 5 : 4 }} spacing="xs">
            <NumberInput
              label="股數"
              size="xs"
              value={sharesInput}
              onChange={handleSharesChange}
              placeholder="0"
              min={0}
              decimalScale={4}
              hideControls
              required
              error={shares > stock.totalShares ? '超過持有股數' : undefined}
            />
            <NumberInput
              label="賣出價格"
              size="xs"
              value={priceInput}
              onChange={handlePriceChange}
              placeholder="0"
              min={0}
              decimalScale={4}
              hideControls
              required
            />
            <NumberInput
              label="總金額"
              size="xs"
              value={amountInput}
              onChange={handleAmountChange}
              placeholder="自動計算"
              min={0}
              decimalScale={2}
              hideControls
            />
            <DateInput
              label="日期"
              size="xs"
              value={dateInput}
              onChange={(v) => setDateInput(v ? new Date(v) : new Date())}
              required
            />
            {isUS && (
              <NumberInput
                label="匯率"
                size="xs"
                value={rateInput}
                onChange={setRateInput}
                placeholder={currentUsdRate > 0 ? currentUsdRate.toFixed(2) : '當日匯率'}
                min={0}
                decimalScale={4}
                hideControls
              />
            )}
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="xs" mt="xs">
            <NumberInput
              label="手續費"
              size="xs"
              value={commissionInput}
              onChange={setCommissionInput}
              placeholder="0"
              min={0}
              decimalScale={2}
              hideControls
            />
            <NumberInput
              label="交易稅"
              size="xs"
              value={taxInput}
              onChange={setTaxInput}
              placeholder="0"
              min={0}
              decimalScale={2}
              hideControls
            />
          </SimpleGrid>
          <TextInput
            mt="xs"
            size="xs"
            placeholder="備註（選填）"
            value={noteInput}
            onChange={(e) => setNoteInput(e.currentTarget.value)}
          />
        </Paper>

        {shares > 0 && toNum(priceInput) > 0 && (
          <Alert color={estimatedPL >= 0 ? 'teal' : 'red'} variant="light" py="xs">
            <Text size="sm" fw={500}>
              預估已實現損益：{formatAmount(estimatedPL, stock.market)}
              <Text component="span" size="xs" ml={4}>
                ({stock.averagePrice > 0 ? ((estimatedPL / (stock.averagePrice * shares)) * 100).toFixed(2) : '0.00'}%)
              </Text>
            </Text>
          </Alert>
        )}

        <Group grow>
          <Button variant="default" onClick={onCancel} type="button">
            取消
          </Button>
          <Button
            type="submit"
            color="orange"
            loading={isSubmitting}
            disabled={shares <= 0 || shares > stock.totalShares}
          >
            確認賣出
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
