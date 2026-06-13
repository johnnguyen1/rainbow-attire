'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import type { UserRole } from '@/lib/types';

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

/** Requires a signed-in user with a verified email. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, firebaseUser, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const verified = firebaseUser?.emailVerified === true;

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser || !user) {
      router.replace(`/auth/login/?returnUrl=${encodeURIComponent(pathname)}`);
    } else if (!verified) {
      router.replace('/auth/verification-pending/');
    }
  }, [loading, firebaseUser, user, verified, router, pathname]);

  if (loading || !firebaseUser || !user || !verified) {
    return <FullPageSpinner />;
  }
  return <>{children}</>;
}

/** Requires one of the given roles (use inside RequireAuth). */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const router = useRouter();

  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (!loading && user && !allowed) {
      router.replace('/products/');
    }
  }, [loading, user, allowed, router]);

  if (loading || !allowed) {
    return <FullPageSpinner />;
  }
  return <>{children}</>;
}

/** Redirects signed-in, verified users away from auth pages. */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { loading, firebaseUser, user } = useAuth();
  const router = useRouter();

  const shouldRedirect = !loading && !!firebaseUser && !!user && firebaseUser.emailVerified;

  useEffect(() => {
    if (shouldRedirect) {
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl');
      router.replace(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/products/');
    }
  }, [shouldRedirect, router]);

  if (loading || shouldRedirect) {
    return <FullPageSpinner />;
  }
  return <>{children}</>;
}
