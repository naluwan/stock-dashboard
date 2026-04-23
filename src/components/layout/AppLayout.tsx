'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell, Burger, Group, NavLink, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LayoutDashboard, Briefcase, Bell, Settings, TrendingUp, Search, Star } from 'lucide-react';

const navItems = [
  { href: '/', label: '總覽', icon: LayoutDashboard },
  { href: '/search', label: '股票搜尋', icon: Search },
  { href: '/watchlist', label: '自選股票', icon: Star },
  { href: '/stocks', label: '持股管理', icon: Briefcase },
  { href: '/alerts', label: '價格警報', icon: Bell },
  { href: '/settings', label: '通知設定', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 240,
        breakpoint: 'lg',
        collapsed: { mobile: !mobileOpened },
      }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" wrap="nowrap">
          <Burger opened={mobileOpened} onClick={toggleMobile} size="sm" hiddenFrom="lg" />
          <Group gap={10}>
            <ThemeIcon size={30} radius="md" variant="light" color="teal">
              <TrendingUp size={16} />
            </ThemeIcon>
            <Text fw={700} size="md">Stock Dashboard</Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={<Icon size={18} />}
                active={isActive}
                variant="light"
                color="teal"
                onClick={closeMobile}
                mb={4}
              />
            );
          })}
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed" px="xs" py="sm">v1.0.0</Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
