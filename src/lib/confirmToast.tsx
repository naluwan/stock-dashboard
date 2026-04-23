'use client';

import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';

/**
 * 用 Mantine modals 實作確認對話框，取代 window.confirm
 * 保留 confirmToast 名稱以維持既有 caller 相容
 */
export function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    modals.openConfirmModal({
      title: '確認',
      centered: true,
      children: <Text size="sm">{message}</Text>,
      labels: { confirm: '確定', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
