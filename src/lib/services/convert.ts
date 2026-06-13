import { Timestamp } from 'firebase/firestore';

/** Converts Firestore Timestamp (or Date/undefined) to a Date. */
export function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}
