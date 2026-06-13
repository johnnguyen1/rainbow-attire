import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { toDate } from '@/lib/services/convert';
import type { Company } from '@/lib/types';

const COMPANIES = 'companies';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCompany(id: string, data: any): Company {
  return {
    id,
    displayName: data.displayName ?? '',
    emailDomain: data.emailDomain ?? '',
    mainLogo: data.mainLogo ?? { imageUrl: '', width: 0, height: 0 },
    embroideryLogos: data.embroideryLogos ?? [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getCompanyById(id: string): Promise<Company | null> {
  if (!id) return null;
  const snap = await getDoc(doc(db, COMPANIES, id));
  if (!snap.exists()) return null;
  return mapCompany(snap.id, snap.data());
}

export async function getAllCompanies(): Promise<Company[]> {
  const snap = await getDocs(collection(db, COMPANIES));
  return snap.docs.map((d) => mapCompany(d.id, d.data()));
}

export async function findCompanyIdByEmailDomain(email: string): Promise<string | null> {
  const domain = email.split('@')[1];
  if (!domain) return null;
  const snap = await getDocs(
    query(collection(db, COMPANIES), where('emailDomain', '==', domain), limit(1))
  );
  return snap.empty ? null : snap.docs[0].id;
}

export async function upsertCompany(
  id: string,
  data: {
    displayName: string;
    emailDomain: string;
    mainLogo: Company['mainLogo'];
    embroideryLogos: Company['embroideryLogos'];
  },
  isNew: boolean
): Promise<void> {
  const ref = doc(db, COMPANIES, id);
  if (isNew) {
    await setDoc(ref, { ...data, createdAt: new Date(), updatedAt: new Date() });
  } else {
    await updateDoc(ref, { ...data, updatedAt: new Date() });
  }
}

export async function deleteCompany(id: string): Promise<void> {
  await deleteDoc(doc(db, COMPANIES, id));
}
