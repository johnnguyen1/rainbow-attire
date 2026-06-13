'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RedirectIfAuthenticated } from '@/components/guards';
import { useAuth } from '@/components/auth-provider';
import { authErrorMessage } from '@/lib/auth-errors';

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName.trim(), lastName.trim());
      router.push('/auth/verification-pending/');
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Use your work email — you&apos;ll be matched to your company automatically
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
        <CardFooter className="flex flex-col gap-4 pt-6">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login/" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <RegisterForm />
    </RedirectIfAuthenticated>
  );
}
