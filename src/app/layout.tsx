import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import AlertPollerProvider from '@/components/layout/AlertPollerProvider';
import ToastProvider from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'Stock Dashboard - 股票投資監控',
  description: '股票投資組合監控、均價計算、價格警報通知系統',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-100 text-gray-900 antialiased dark:bg-gray-900 dark:text-white">
        <AlertPollerProvider />
        <ToastProvider />
        <Sidebar />
        <main className="min-h-screen transition-all lg:ml-60">
          {children}
        </main>
      </body>
    </html>
  );
}
