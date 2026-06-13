'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/auth-provider';
import { authErrorMessage } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase-client';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

export default function VerificationPendingPage() {
  const router = useRouter();
  const { firebaseUser, loading, logout, resendVerificationEmail, refreshProfile } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/auth/login/');
    }
  }, [loading, firebaseUser, router]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = auth.currentUser;
      if (!current || pollCount.current >= MAX_POLLS) return;
      pollCount.current += 1;
      try {
        await current.reload();
        if (current.emailVerified) {
          clearInterval(interval);
          await refreshProfile();
          router.push('/products/');
        }
      } catch {
        // Transient reload failure; keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router, refreshProfile]);

  async function handleResend() {
    setError(null);
    setStatus(null);
    setResending(true);
    try {
      await resendVerificationEmail();
      setStatus('Verification email sent. Check your inbox.');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/auth/login/');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          {firebaseUser?.email
            ? `We sent a verification link to ${firebaseUser.email}.`
            : 'We sent you a verification link.'}{' '}
          This page will refresh automatically once you&apos;re verified.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <Alert>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-2">
        <Button className="w-full" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending…' : 'Resend verification email'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={handleLogout}>
          Sign out
        </Button>
      </CardFooter>
    </Card>
  );
}
