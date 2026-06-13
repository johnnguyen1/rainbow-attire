'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RedirectIfAuthenticated } from '@/components/guards';
import { useAuth } from '@/components/auth-provider';
import { authErrorMessage } from '@/lib/auth-errors';

function ForgotPasswordForm() {
  const { sendResetEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendResetEmail(email);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>We&apos;ll email you a link to reset your password</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {sent && (
            <Alert>
              <AlertDescription>
                If an account exists for {email}, a reset link is on its way.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6">
          <Button type="submit" className="w-full" disabled={loading || sent}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link href="/auth/login/" className="text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <RedirectIfAuthenticated>
      <ForgotPasswordForm />
    </RedirectIfAuthenticated>
  );
}
