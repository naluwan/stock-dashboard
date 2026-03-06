'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, Bell, Settings, TrendingUp, Menu, X, Search, Star } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '總覽', icon: LayoutDashboard },
  { href: '/search', label: '股票搜尋', icon: Search },
  { href: '/watchlist', label: '自選股票', icon: Star },
  { href: '/stocks', label: '持股管理', icon: Briefcase },
  { href: '/alerts', label: '價格警報', icon: Bell },
  { href: '/settings', label: '通知設定', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-gray-900 p-2 text-white shadow-lg lg:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-60 transform border-r border-gray-800 bg-gray-950 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo 區域 — 高度和右側 Header 對齊 */}
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <h1 className="text-base font-bold tracking-tight">Stock Dashboard</h1>
        </div>

        <nav className="mt-2 px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部版本資訊 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800/60 px-5 py-3">
          <p className="text-[11px] text-gray-600">v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
