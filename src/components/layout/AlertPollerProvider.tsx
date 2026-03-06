'use client';

import { useAlertPoller } from '@/hooks/useAlertPoller';

export default function AlertPollerProvider() {
  useAlertPoller();
  return null;
}
