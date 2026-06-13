'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/auth/login/${window.location.search}`);
  }, [router]);
  return null;
}
