'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings, ShieldCheck, ShoppingCart, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { cn } from '@/lib/utils';

interface HeaderProps {
  companyName?: string;
  companyLogoUrl?: string;
}

export function Header({ companyName, companyLogoUrl }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { count } = useCart();

  const role = user?.role ?? 'user';
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  async function handleLogout() {
    await logout();
    router.push('/auth/login/');
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium transition-colors hover:text-foreground',
        pathname.startsWith(href) ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/products/" className="flex items-center gap-3">
          {companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogoUrl}
              alt={companyName ?? 'Company logo'}
              className="h-9 w-auto object-contain"
            />
          ) : null}
          <span className="text-lg font-bold tracking-tight">Rainbow Attire</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {navLink('/products', 'Products')}
          {navLink('/account', 'My Orders')}
          {(role === 'manager' || role === 'admin') && navLink('/manager', 'Manager')}
          {role === 'admin' && navLink('/admin', 'Admin')}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            render={<Link href="/cart/" aria-label="Cart" />}
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                {count}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="Account menu" />}
            >
              <UserIcon className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="font-medium">{userName || user?.email}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
                  {companyName && (
                    <div className="text-xs font-normal text-muted-foreground">{companyName}</div>
                  )}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/account/" />}>
                <Settings className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
              {(role === 'manager' || role === 'admin') && (
                <DropdownMenuItem render={<Link href="/manager/" />}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Manager dashboard
                </DropdownMenuItem>
              )}
              {role === 'admin' && (
                <DropdownMenuItem render={<Link href="/admin/" />}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
