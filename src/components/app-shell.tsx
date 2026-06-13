'use client';

import { useEffect, useState } from 'react';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { useAuth } from '@/components/auth-provider';
import { getCompanyById } from '@/lib/services/companies';
import type { Company } from '@/lib/types';

/** Header + footer chrome with the user's company loaded for branding. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.company) {
      setCompany(null);
      return;
    }
    getCompanyById(user.company).then((result) => {
      if (!cancelled) setCompany(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.company]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        companyName={company?.displayName}
        companyLogoUrl={company?.mainLogo?.imageUrl || undefined}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
