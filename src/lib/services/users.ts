import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { toDate } from '@/lib/services/convert';
import type { User, UserRole } from '@/lib/types';

const USERS = 'users';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(id: string, data: any): User {
  return {
    uid: id,
    email: data.email ?? '',
    emailVerified: data.emailVerified ?? false,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    company: data.company ?? '',
    role: (data.role as UserRole) ?? 'user',
    locCode: data.locCode ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return mapUser(snap.id, snap.data());
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, USERS));
  return snap.docs.map((d) => mapUser(d.id, d.data()));
}

export async function getUsersByCompany(companyId: string): Promise<User[]> {
  if (!companyId) return [];
  const snap = await getDocs(query(collection(db, USERS), where('company', '==', companyId)));
  return snap.docs.map((d) => mapUser(d.id, d.data()));
}

export async function createUserDoc(
  uid: string,
  data: {
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    company: string;
    role: UserRole;
  }
): Promise<void> {
  await setDoc(doc(db, USERS, uid), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateUserDoc(
  uid: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    company: string;
    role: UserRole;
    locCode: string | null;
    emailVerified: boolean;
  }>
): Promise<void> {
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    update[key] = value === null ? deleteField() : value;
  }
  await updateDoc(doc(db, USERS, uid), update);
}
