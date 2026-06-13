'use client';

import { AppShell } from '@/components/app-shell';
import { RequireAuth, RequireRole } from '@/components/guards';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireRole roles={['manager', 'admin']}>
        <AppShell>{children}</AppShell>
      </RequireRole>
    </RequireAuth>
  );
}
