import type { Metadata } from 'next';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import AlertPollerProvider from '@/components/layout/AlertPollerProvider';
import ToastProvider from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'Stock Dashboard - 股票投資監控',
  description: '股票投資組合監控、均價計算、價格警報通知系統',
};

const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
  defaultRadius: 'md',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className="bg-gray-100 text-gray-900 antialiased dark:bg-gray-900 dark:text-white">
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <AlertPollerProvider />
          <ToastProvider />
          <Sidebar />
          <main className="min-h-screen transition-all lg:ml-60">
            {children}
          </main>
        </MantineProvider>
      </body>
    </html>
  );
}
