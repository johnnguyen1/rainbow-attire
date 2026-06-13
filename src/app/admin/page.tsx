'use client';

import Link from 'next/link';
import { Building2, Package, Users } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SECTIONS = [
  {
    href: '/admin/products/',
    icon: Package,
    title: 'Products',
    description: 'Manage the catalog, import scraper JSON, and update buyer costs',
  },
  {
    href: '/admin/companies/',
    icon: Building2,
    title: 'Companies',
    description: 'Manage companies, email domains, and branding logos',
  },
  {
    href: '/admin/users/',
    icon: Users,
    title: 'Users',
    description: 'Manage user roles, company assignments, and location codes',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <Icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
