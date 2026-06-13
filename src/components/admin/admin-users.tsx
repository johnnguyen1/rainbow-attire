'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/components/auth-provider';
import { ACME_BRICK_COMPANY_ID, ACME_BRICK_LOCATION_CODES } from '@/lib/constants/location-codes';
import { getAllCompanies } from '@/lib/services/companies';
import { setUserRole } from '@/lib/services/roles';
import { getAllUsers, updateUserDoc } from '@/lib/services/users';
import type { Company, User, UserRole } from '@/lib/types';

const NONE = '__none__';

interface EditState {
  user: User;
  role: UserRole;
  company: string;
  locCode: string;
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setUsers(
      (await getAllUsers()).sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
    );
  }

  useEffect(() => {
    Promise.all([loadUsers(), getAllCompanies().then(setCompanies)]).catch(() =>
      toast.error('Failed to load users')
    );
  }, []);

  async function save() {
    if (!edit) return;
    setSaving(true);
    try {
      const updates: Parameters<typeof updateUserDoc>[1] = {};
      if (edit.company !== edit.user.company) updates.company = edit.company;
      const locCode = edit.locCode.trim();
      if (locCode !== (edit.user.locCode ?? '')) {
        updates.locCode = locCode === '' ? null : locCode;
      }
      if (Object.keys(updates).length > 0) {
        await updateUserDoc(edit.user.uid, updates);
      }

      // Role goes through the unified path so Firestore and Auth claims stay in sync
      if (edit.role !== edit.user.role) {
        await setUserRole(edit.user.uid, edit.role);
      }

      toast.success('User updated');
      setEdit(null);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  const filtered = (users ?? []).filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(term) ||
      (user.email ?? '').toLowerCase().includes(term) ||
      (user.company ?? '').toLowerCase().includes(term)
    );
  });

  const companyName = (id: string) =>
    companies.find((company) => company.id === id)?.displayName || id || '—';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to admin
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">User management</h1>
        <Input
          placeholder="Search users…"
          className="w-full sm:w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {users === null ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Loc code</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">
                      {`${user.firstName} ${user.lastName}`.trim() || '—'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{companyName(user.company)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.locCode || '—'}</TableCell>
                    <TableCell>{user.emailVerified ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEdit({
                            user,
                            role: user.role,
                            company: user.company ?? '',
                            locCode: user.locCode ?? '',
                          })
                        }
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              {edit ? `${edit.user.firstName} ${edit.user.lastName} · ${edit.user.email}` : ''}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={edit.role}
                  onValueChange={(value) => setEdit({ ...edit, role: value as UserRole })}
                >
                  <SelectTrigger disabled={edit.user.uid === currentUser?.uid}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {edit.user.uid === currentUser?.uid && (
                  <p className="text-xs text-muted-foreground">
                    You can&apos;t change your own role.
                  </p>
                )}
                {edit.role !== edit.user.role && (
                  <p className="text-xs text-muted-foreground">
                    Role changes update both the profile and auth claims; the user&apos;s
                    sessions are refreshed.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={edit.company || NONE}
                  onValueChange={(value) =>
                    setEdit({ ...edit, company: value === NONE ? '' : (value ?? '') })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No company</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location code</Label>
                {edit.company === ACME_BRICK_COMPANY_ID ? (
                  <Select
                    value={edit.locCode || NONE}
                    onValueChange={(value) =>
                      setEdit({ ...edit, locCode: value === NONE ? '' : (value ?? '') })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not set</SelectItem>
                      {ACME_BRICK_LOCATION_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={edit.locCode}
                    onChange={(e) => setEdit({ ...edit, locCode: e.target.value })}
                  />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
