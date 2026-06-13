'use client';

import { AppShell } from '@/components/app-shell';
import { RequireAuth, RequireRole } from '@/components/guards';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireRole roles={['admin']}>
        <AppShell>{children}</AppShell>
      </RequireRole>
    </RequireAuth>
  );
}
