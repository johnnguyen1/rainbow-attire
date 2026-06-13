'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseCsv } from '@/lib/csv';
import { getAllProducts, updateBuyerCosts } from '@/lib/services/products';
import type { Product } from '@/lib/types';

export function ManagerProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvName, setCsvName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadProducts() {
    setProducts((await getAllProducts()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  useEffect(() => {
    loadProducts().catch(() => toast.error('Failed to load products'));
  }, []);

  function handleCsvSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCsv(e.target?.result as string);
        if (rows.length === 0 || !rows.some((row) => row.STYLE && row.COST)) {
          toast.error('CSV must have STYLE and COST columns');
          return;
        }
        setCsvRows(rows);
        setCsvName(file.name);
      } catch {
        toast.error('Invalid CSV file');
      }
    };
    reader.readAsText(file);
  }

  async function applyCsv() {
    const costs = new Map<string, number>();
    csvRows.forEach((row) => {
      if (row.STYLE && row.COST) {
        const cost = parseFloat(row.COST);
        if (!isNaN(cost)) costs.set(row.STYLE.trim(), cost);
      }
    });
    setUploading(true);
    try {
      const updated = await updateBuyerCosts(costs);
      toast.success(`Updated buyer costs for ${updated} products`);
      setCsvRows([]);
      setCsvName('');
      if (fileInput.current) fileInput.current.value = '';
      await loadProducts();
    } catch {
      toast.error('Failed to update buyer costs');
    } finally {
      setUploading(false);
    }
  }

  const filtered = (products ?? []).filter((product) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      product.name.toLowerCase().includes(term) ||
      product.styleNumber.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      product.sizes.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/manager/" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to dashboard
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Input
          placeholder="Search products…"
          className="w-full sm:w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update buyer costs from CSV</CardTitle>
          <CardDescription>
            Upload a CSV with STYLE and COST columns to bulk-update buyer costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            ref={fileInput}
            type="file"
            accept=".csv"
            className="w-auto"
            onChange={handleCsvSelected}
          />
          {csvRows.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {csvName}: {csvRows.length} rows
              </span>
              <Button size="sm" onClick={applyCsv} disabled={uploading}>
                <Upload className="mr-1 h-4 w-4" />
                {uploading ? 'Updating…' : 'Apply costs'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {products === null ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style #</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Available Sizes</TableHead>
                  <TableHead>Buyer Cost</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.styleNumber}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {product.variants.length}{' '}
                      {product.variants.length === 1 ? 'variant' : 'variants'}
                    </TableCell>
                    <TableCell>{product.sizes}</TableCell>
                    <TableCell>
                      {product.buyerCost ? `$${product.buyerCost.toFixed(2)}` : 'Not set'}
                    </TableCell>
                    <TableCell>{product.updatedAt.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No products found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
