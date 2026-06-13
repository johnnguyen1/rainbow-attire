'use client';

import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/guards';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
