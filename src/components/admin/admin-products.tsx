'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Pencil, Trash2, Upload, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { parseCsv } from '@/lib/csv';
import {
  deleteAllProducts,
  deleteProduct,
  getAllProducts,
  importProducts,
  updateBuyerCosts,
  updateProduct,
  validateImportProducts,
  type ImportProduct,
} from '@/lib/services/products';
import type { Product } from '@/lib/types';

function JsonImportCard({ onImported }: { onImported: () => Promise<void> }) {
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const { valid, errors: validationErrors } = validateImportProducts(parsed);
        setProducts(valid);
        setErrors(validationErrors);
        setFileName(file.name);
      } catch {
        toast.error('Invalid JSON file');
        setProducts([]);
        setErrors([]);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setUploading(true);
    try {
      const { created, updated } = await importProducts(products);
      toast.success(`Import complete: ${created} created, ${updated} updated`);
      setProducts([]);
      setErrors([]);
      setFileName('');
      if (fileInput.current) fileInput.current.value = '';
      await onImported();
    } catch {
      toast.error('Import failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import products from JSON</CardTitle>
        <CardDescription>
          Upload the scraper output (array of products with styleNumber, name, description,
          sizes, variants). Existing style numbers are updated; new ones are created.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input ref={fileInput} type="file" accept=".json" className="w-auto" onChange={handleFile} />
        {fileName && (
          <p className="text-sm text-muted-foreground">
            {fileName}: {products.length} valid products
            {errors.length > 0 ? `, ${errors.length} skipped` : ''}
          </p>
        )}
        {errors.length > 0 && (
          <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-destructive">
            {errors.slice(0, 20).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
        {products.length > 0 && (
          <Button size="sm" onClick={handleImport} disabled={uploading}>
            <Upload className="mr-1 h-4 w-4" />
            {uploading ? 'Importing…' : `Import ${products.length} products`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CsvCostCard({ onUpdated }: { onUpdated: () => Promise<void> }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCsv(e.target?.result as string);
        if (!parsed.some((row) => row.STYLE && row.COST)) {
          toast.error('CSV must have STYLE and COST columns');
          return;
        }
        setRows(parsed);
        setFileName(file.name);
      } catch {
        toast.error('Invalid CSV file');
      }
    };
    reader.readAsText(file);
  }

  async function handleApply() {
    const costs = new Map<string, number>();
    rows.forEach((row) => {
      if (row.STYLE && row.COST) {
        const cost = parseFloat(row.COST);
        if (!isNaN(cost)) costs.set(row.STYLE.trim(), cost);
      }
    });
    setUploading(true);
    try {
      const updated = await updateBuyerCosts(costs);
      toast.success(`Updated buyer costs for ${updated} products`);
      setRows([]);
      setFileName('');
      if (fileInput.current) fileInput.current.value = '';
      await onUpdated();
    } catch {
      toast.error('Failed to update buyer costs');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Update buyer costs from CSV</CardTitle>
        <CardDescription>CSV with STYLE and COST columns, keyed by style number.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Input ref={fileInput} type="file" accept=".csv" className="w-auto" onChange={handleFile} />
        {rows.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">
              {fileName}: {rows.length} rows
            </span>
            <Button size="sm" onClick={handleApply} disabled={uploading}>
              <Upload className="mr-1 h-4 w-4" />
              {uploading ? 'Updating…' : 'Apply costs'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState('');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [costValue, setCostValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadProducts() {
    setProducts((await getAllProducts()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  useEffect(() => {
    loadProducts().catch(() => toast.error('Failed to load products'));
  }, []);

  async function saveCost(product: Product) {
    const parsed = costValue.trim() === '' ? null : parseFloat(costValue);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error('Enter a valid cost');
      return;
    }
    try {
      await updateProduct(product.id, { buyerCost: parsed });
      toast.success('Buyer cost updated');
      setEditingCostId(null);
      await loadProducts();
    } catch {
      toast.error('Failed to update buyer cost');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      await loadProducts();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAll() {
    setBusy(true);
    try {
      const count = await deleteAllProducts();
      toast.success(`Deleted ${count} products`);
      setDeleteAllOpen(false);
      await loadProducts();
    } catch {
      toast.error('Failed to delete products');
    } finally {
      setBusy(false);
    }
  }

  const filtered = (products ?? []).filter((product) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      product.name.toLowerCase().includes(term) ||
      product.styleNumber.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to admin
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Product management</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search products…"
            className="w-full sm:w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={!products || products.length === 0}
            onClick={() => setDeleteAllOpen(true)}
          >
            Delete all
          </Button>
        </div>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">
            Catalog ({products?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="pt-4">
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
                      <TableHead>Sizes</TableHead>
                      <TableHead>Buyer Cost</TableHead>
                      <TableHead>Companies</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-xs">{product.styleNumber}</TableCell>
                        <TableCell>
                          <Link
                            href={`/products/detail/?id=${product.id}`}
                            className="hover:underline"
                          >
                            {product.name}
                          </Link>
                        </TableCell>
                        <TableCell>{product.variants.length}</TableCell>
                        <TableCell className="max-w-40 truncate">{product.sizes}</TableCell>
                        <TableCell>
                          {editingCostId === product.id ? (
                            <span className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-8 w-24"
                                value={costValue}
                                onChange={(e) => setCostValue(e.target.value)}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => saveCost(product)}
                                aria-label="Save cost"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditingCostId(null)}
                                aria-label="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="flex items-center gap-1 hover:underline"
                              onClick={() => {
                                setEditingCostId(product.id);
                                setCostValue(product.buyerCost?.toString() ?? '');
                              }}
                            >
                              {product.buyerCost ? `$${product.buyerCost.toFixed(2)}` : 'Not set'}
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="max-w-40 truncate">
                          {product.companies.length === 0
                            ? 'All companies'
                            : product.companies.join(', ')}
                        </TableCell>
                        <TableCell>{product.updatedAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTarget(product)}
                            aria-label="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No products found.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-4 pt-4">
          <JsonImportCard onImported={loadProducts} />
          <CsvCostCard onUpdated={loadProducts} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        busy={busy}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="Delete ALL Products"
        message={`This will permanently delete all ${products?.length ?? 0} products. This action cannot be undone.`}
        confirmText="Delete everything"
        destructive
        busy={busy}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}
