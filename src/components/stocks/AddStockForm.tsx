'use client';

import { useState, useEffect } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { Plus, Trash2 } from 'lucide-react';
import { Market, Purchase } from '@/types';

interface AddStockFormProps {
  onSubmit: (data: {
    symbol: string;
    name: string;
    market: Market;
    purchases: Omit<Purchase, '_id'>[];
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    symbol: string;
    name: string;
    market: Market;
    purchases: Purchase[];
  };
}

type NumValue = number | string; // Mantine NumberInput 支援的中間狀態

const toNum = (v: NumValue): number => {
  if (v === '' || v === '-') return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export default function AddStockForm({ onSubmit, onCancel, initialData }: AddStockFormProps) {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [name, setName] = useState(initialData?.name || '');
  const [market, setMarket] = useState<Market>(initialData?.market || 'TW');

  const initShares = initialData?.purchases?.map((p) => (p.shares || '') as NumValue) || [''];
  const initPrices = initialData?.purchases?.map((p) => (p.price || '') as NumValue) || [''];
  const initAmounts =
    initialData?.purchases?.map((p) => (p.shares && p.price ? round2(p.shares * p.price) : '') as NumValue) || [''];
  const initRates = initialData?.purchases?.map((p) => (p.exchangeRate || '') as NumValue) || [''];
  const initDates = initialData?.purchases?.map((p) => {
    const d = p.date instanceof Date ? p.date : new Date(p.date);
    return d;
  }) || [new Date()];
  const initNotes = initialData?.purchases?.map((p) => p.note || '') || [''];
  const initCommissions = initialData?.purchases?.map((p) => (p.commission || '') as NumValue) || [''];

  const [sharesInputs, setSharesInputs] = useState<NumValue[]>(initShares);
  const [priceInputs, setPriceInputs] = useState<NumValue[]>(initPrices);
  const [amountInputs, setAmountInputs] = useState<NumValue[]>(initAmounts);
  const [rateInputs, setRateInputs] = useState<NumValue[]>(initRates);
  const [dateInputs, setDateInputs] = useState<Date[]>(initDates);
  const [noteInputs, setNoteInputs] = useState<string[]>(initNotes);
  const [commissionInputs, setCommissionInputs] = useState<NumValue[]>(initCommissions);

  const [currentUsdRate, setCurrentUsdRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (market === 'US') {
      fetch('/api/exchange-rate')
        .then((res) => res.json())
        .then((data) => {
          if (data.rate) setCurrentUsdRate(data.rate);
        })
        .catch(() => {});
    }
  }, [market]);

  const addPurchase = () => {
    setSharesInputs([...sharesInputs, '']);
    setPriceInputs([...priceInputs, '']);
    setAmountInputs([...amountInputs, '']);
    setRateInputs([...rateInputs, '']);
    setDateInputs([...dateInputs, new Date()]);
    setNoteInputs([...noteInputs, '']);
    setCommissionInputs([...commissionInputs, '']);
  };

  const removePurchase = (index: number) => {
    if (sharesInputs.length > 1) {
      const remove = <T,>(_: T, i: number) => i !== index;
      setSharesInputs(sharesInputs.filter(remove));
      setPriceInputs(priceInputs.filter(remove));
      setAmountInputs(amountInputs.filter(remove));
      setRateInputs(rateInputs.filter(remove));
      setDateInputs(dateInputs.filter(remove));
      setNoteInputs(noteInputs.filter(remove));
      setCommissionInputs(commissionInputs.filter(remove));
    }
  };

  const updateAt = <T,>(arr: T[], index: number, value: T): T[] => {
    const newArr = [...arr];
    newArr[index] = value;
    return newArr;
  };

  const handleSharesChange = (index: number, raw: NumValue) => {
    setSharesInputs(updateAt(sharesInputs, index, raw));
    const shares = toNum(raw);
    const price = toNum(priceInputs[index]);
    if (price > 0 && shares > 0) {
      setAmountInputs(updateAt(amountInputs, index, round2(shares * price)));
    }
  };

  const handlePriceChange = (index: number, raw: NumValue) => {
    setPriceInputs(updateAt(priceInputs, index, raw));
    const price = toNum(raw);
    const shares = toNum(sharesInputs[index]);
    if (shares > 0 && price > 0) {
      setAmountInputs(updateAt(amountInputs, index, round2(shares * price)));
    }
  };

  const handleAmountChange = (index: number, raw: NumValue) => {
    setAmountInputs(updateAt(amountInputs, index, raw));
    const amount = toNum(raw);
    const price = toNum(priceInputs[index]);
    const shares = toNum(sharesInputs[index]);

    if (price > 0 && amount > 0) {
      setSharesInputs(updateAt(sharesInputs, index, round2(amount / price)));
    } else if (shares > 0 && amount > 0) {
      setPriceInputs(updateAt(priceInputs, index, round2(amount / shares)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const purchases: Omit<Purchase, '_id'>[] = sharesInputs.map((_, i) => {
        const base: Omit<Purchase, '_id'> = {
          shares: toNum(sharesInputs[i]),
          price: toNum(priceInputs[i]),
          date: dateInputs[i] ?? new Date(),
          note: noteInputs[i] || undefined,
        };
        const comm = toNum(commissionInputs[i]);
        if (comm > 0) base.commission = comm;
        if (market === 'US') {
          const rate = toNum(rateInputs[i]);
          base.exchangeRate = rate > 0 ? rate : currentUsdRate || undefined;
        }
        return base;
      });
      await onSubmit({ symbol: symbol.toUpperCase(), name, market, purchases });
    } finally {
      setIsSubmitting(false);
    }
  };

  const purchaseCount = sharesInputs.length;

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <SimpleGrid cols={2} spacing="md">
          <TextInput
            label="股票代碼"
            placeholder={market === 'TW' ? '例: 2330' : '例: AAPL'}
            value={symbol}
            onChange={(e) => setSymbol(e.currentTarget.value)}
            required
            disabled={!!initialData}
          />
          <TextInput
            label="股票名稱"
            placeholder="例: 台積電"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
        </SimpleGrid>

        <div>
          <Text size="sm" fw={500} mb={6}>市場</Text>
          <SegmentedControl
            fullWidth
            value={market}
            onChange={(v) => setMarket(v as Market)}
            disabled={!!initialData}
            data={[
              { label: '🇹🇼 台股', value: 'TW' },
              { label: '🇺🇸 美股', value: 'US' },
            ]}
          />
        </div>

        <div>
          <Group justify="space-between" mb={6}>
            <Text size="sm" fw={500}>購買紀錄</Text>
            <Button
              variant="subtle"
              size="compact-xs"
              leftSection={<Plus size={12} />}
              onClick={addPurchase}
            >
              新增一筆
            </Button>
          </Group>

          <ScrollArea.Autosize mah={320}>
            <Stack gap="sm">
              {Array.from({ length: purchaseCount }).map((_, index) => (
                <Paper key={index} p="sm" bg="var(--mantine-color-default-hover)" radius="md">
                  <Group justify="space-between" mb={8}>
                    <Text size="xs" c="dimmed" fw={500}>第 {index + 1} 筆</Text>
                    {purchaseCount > 1 && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => removePurchase(index)}
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: market === 'US' ? 5 : 4 }} spacing="xs">
                    <NumberInput
                      label="股數"
                      size="xs"
                      value={sharesInputs[index]}
                      onChange={(v) => handleSharesChange(index, v)}
                      placeholder="0"
                      min={0}
                      decimalScale={4}
                      hideControls
                      required
                    />
                    <NumberInput
                      label="買入價格"
                      size="xs"
                      value={priceInputs[index]}
                      onChange={(v) => handlePriceChange(index, v)}
                      placeholder="0"
                      min={0}
                      decimalScale={4}
                      hideControls
                      required
                    />
                    <NumberInput
                      label="總金額"
                      size="xs"
                      value={amountInputs[index]}
                      onChange={(v) => handleAmountChange(index, v)}
                      placeholder="自動計算"
                      min={0}
                      decimalScale={2}
                      hideControls
                    />
                    <DateInput
                      label="日期"
                      size="xs"
                      value={dateInputs[index]}
                      onChange={(v) =>
                        setDateInputs(updateAt(dateInputs, index, (v ? new Date(v) : new Date())))
                      }
                      required
                    />
                    {market === 'US' && (
                      <NumberInput
                        label="匯率"
                        size="xs"
                        value={rateInputs[index]}
                        onChange={(v) => setRateInputs(updateAt(rateInputs, index, v))}
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
                      value={commissionInputs[index]}
                      onChange={(v) => setCommissionInputs(updateAt(commissionInputs, index, v))}
                      placeholder="0"
                      min={0}
                      decimalScale={2}
                      hideControls
                    />
                    <TextInput
                      label="備註"
                      size="xs"
                      value={noteInputs[index]}
                      onChange={(e) => setNoteInputs(updateAt(noteInputs, index, e.currentTarget.value))}
                      placeholder="選填"
                    />
                  </SimpleGrid>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </div>

        <Group grow>
          <Button variant="default" onClick={onCancel} type="button">
            取消
          </Button>
          <Button type="submit" color="teal" loading={isSubmitting}>
            {initialData ? '更新' : '新增'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
