'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authErrorMessage } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase-client';

function VerifyEmailHandler({ oobCode }: { oobCode: string }) {
  const router = useRouter();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await applyActionCode(auth, oobCode);
        await auth.currentUser?.reload();
        if (!cancelled) setState('done');
      } catch (err) {
        if (!cancelled) {
          setError(authErrorMessage(err));
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>
          {state === 'working' && 'Verifying your email…'}
          {state === 'done' && 'Your email has been verified.'}
          {state === 'error' && 'We could not verify your email.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        {state === 'done' ? (
          <Button className="w-full" onClick={() => router.push('/products')}>
            Continue to the store
          </Button>
        ) : state === 'error' ? (
          <Button variant="outline" className="w-full" render={<Link href="/auth/login" />}>
            Back to sign in
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function ResetPasswordHandler({ oobCode }: { oobCode: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<'verifying' | 'ready' | 'done' | 'invalid'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    verifyPasswordResetCode(auth, oobCode)
      .then((accountEmail) => {
        if (!cancelled) {
          setEmail(accountEmail);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setState('done');
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (state === 'invalid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link expired</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            render={<Link href="/auth/forgot-password" />}
          >
            Request a new link
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state === 'done') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>You can now sign in with your new password.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push('/auth/login')}>
            Go to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          {state === 'verifying' ? 'Checking your link…' : `For ${email}`}
        </CardDescription>
      </CardHeader>
      {state === 'ready' && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="pt-6">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

function AuthActionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  if (!oobCode || (mode !== 'verifyEmail' && mode !== 'resetPassword')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>This link is malformed or unsupported.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full" render={<Link href="/auth/login" />}>
            Back to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return mode === 'verifyEmail' ? (
    <VerifyEmailHandler oobCode={oobCode} />
  ) : (
    <ResetPasswordHandler oobCode={oobCode} />
  );
}

export default function AuthActionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Rainbow Attire</h1>
      </div>
      <div className="w-full max-w-md">
        <Suspense>
          <AuthActionContent />
        </Suspense>
      </div>
    </div>
  );
}
