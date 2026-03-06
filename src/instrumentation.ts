export async function register() {
  // 只在 Node.js runtime 啟動 cron（不在 edge runtime）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronScheduler } = await import('@/lib/cron-scheduler');
    startCronScheduler();
  }
}
