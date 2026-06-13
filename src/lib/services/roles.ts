import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase-client';
import { updateUserDoc } from '@/lib/services/users';
import type { UserRole } from '@/lib/types';

/**
 * Single role-mutation path: updates the Firestore role AND syncs Firebase Auth
 * custom claims via the deployed `setCustomClaims` Cloud Function (which also
 * revokes the target's refresh tokens). Fixes the legacy gap where the two
 * role stores drifted apart. Caller must be an admin (enforced by the function
 * and by Firestore rules).
 */
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateUserDoc(uid, { role });
  const setCustomClaims = httpsCallable(functions, 'setCustomClaims');
  await setCustomClaims({
    targetUserId: uid,
    claims: { admin: role === 'admin', role },
  });
}
