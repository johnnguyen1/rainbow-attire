'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/auth/register/${window.location.search}`);
  }, [router]);
  return null;
}
