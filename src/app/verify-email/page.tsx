'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Legacy Firebase email-template route; forwards to the unified handler. */
export default function VerifyEmailRedirect() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('mode')) params.set('mode', 'verifyEmail');
    router.replace(`/auth-action/?${params.toString()}`);
  }, [router]);
  return null;
}
