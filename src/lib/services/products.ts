import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { toDate } from '@/lib/services/convert';
import type { Product, ProductVariant } from '@/lib/types';

const PRODUCTS = 'products';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(id: string, data: any): Product {
  return {
    id,
    styleNumber: data.styleNumber ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    sizes: data.sizes ?? '',
    buyerCost: data.buyerCost ?? undefined,
    variants: data.variants ?? [],
    companies: data.companies ?? [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, PRODUCTS));
  return snap.docs.map((d) => mapProduct(d.id, d.data()));
}

export async function getProductsByCompany(companyId: string): Promise<Product[]> {
  if (!companyId) return [];
  const snap = await getDocs(
    query(collection(db, PRODUCTS), where('companies', 'array-contains', companyId))
  );
  return snap.docs.map((d) => mapProduct(d.id, d.data()));
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, PRODUCTS, id));
  if (!snap.exists()) return null;
  return mapProduct(snap.id, snap.data());
}

export async function updateProduct(
  id: string,
  data: Partial<{ buyerCost: number | null; companies: string[] }>
): Promise<void> {
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    update[key] = value === null ? deleteField() : value;
  }
  await updateDoc(doc(db, PRODUCTS, id), update);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS, id));
}

export async function deleteAllProducts(): Promise<number> {
  const snap = await getDocs(collection(db, PRODUCTS));
  // Firestore batches max out at 500 operations
  for (let i = 0; i < snap.docs.length; i += 500) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.length;
}

export interface ImportProduct {
  styleNumber: string;
  name: string;
  description: string;
  sizes: string;
  variants: ProductVariant[];
}

export function validateImportProducts(data: unknown): {
  valid: ImportProduct[];
  errors: string[];
} {
  const errors: string[] = [];
  if (!Array.isArray(data)) {
    return { valid: [], errors: ['JSON must be an array of products'] };
  }

  const valid: ImportProduct[] = [];
  data.forEach((item, index) => {
    const label = item?.styleNumber || `item ${index + 1}`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label}: not an object`);
      return;
    }
    for (const field of ['styleNumber', 'name', 'description', 'sizes'] as const) {
      if (typeof item[field] !== 'string' || !item[field]) {
        errors.push(`${label}: missing field "${field}"`);
        return;
      }
    }
    if (!Array.isArray(item.variants) || item.variants.length === 0) {
      errors.push(`${label}: missing variants`);
      return;
    }
    for (const variant of item.variants) {
      if (!variant?.id || !variant?.name || !Array.isArray(variant?.images)) {
        errors.push(`${label}: invalid variant structure`);
        return;
      }
    }
    valid.push({
      styleNumber: item.styleNumber,
      name: item.name,
      description: item.description,
      sizes: item.sizes,
      variants: item.variants,
    });
  });

  return { valid, errors };
}

/** Upserts scraper-format products by styleNumber. Returns created/updated counts. */
export async function importProducts(
  products: ImportProduct[]
): Promise<{ created: number; updated: number }> {
  const existingSnap = await getDocs(collection(db, PRODUCTS));
  const byStyle = new Map(
    existingSnap.docs
      .filter((d) => d.data().styleNumber)
      .map((d) => [d.data().styleNumber as string, d.ref])
  );

  let created = 0;
  let updated = 0;

  for (let i = 0; i < products.length; i += 250) {
    const batch = writeBatch(db);
    for (const product of products.slice(i, i + 250)) {
      const existingRef = byStyle.get(product.styleNumber);
      if (existingRef) {
        batch.update(existingRef, {
          name: product.name,
          description: product.description,
          sizes: product.sizes,
          variants: product.variants,
          updatedAt: new Date(),
        });
        updated++;
      } else {
        const ref = doc(collection(db, PRODUCTS));
        batch.set(ref, {
          styleNumber: product.styleNumber,
          name: product.name,
          description: product.description,
          sizes: product.sizes,
          variants: product.variants,
          companies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        created++;
      }
    }
    await batch.commit();
  }

  return { created, updated };
}

/** Bulk-updates buyerCost keyed by styleNumber (CSV import). Returns updated count. */
export async function updateBuyerCosts(costs: Map<string, number>): Promise<number> {
  const snap = await getDocs(collection(db, PRODUCTS));
  let updatedCount = 0;
  for (let i = 0; i < snap.docs.length; i += 500) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + 500)) {
      const cost = costs.get(d.data().styleNumber);
      if (cost !== undefined) {
        batch.update(d.ref, { buyerCost: cost, updatedAt: new Date() });
        updatedCount++;
      }
    }
    await batch.commit();
  }
  return updatedCount;
}
