'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAuth } from '@/components/auth-provider';
import { ACME_BRICK_COMPANY_ID, ACME_BRICK_LOCATION_CODES } from '@/lib/constants/location-codes';
import { getUsersByCompany, updateUserDoc } from '@/lib/services/users';
import type { User } from '@/lib/types';

export function ManagerUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [locCode, setLocCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);

  const isAcmeBrick = currentUser?.company === ACME_BRICK_COMPANY_ID;

  const loadUsers = useCallback(async () => {
    if (!currentUser?.company) {
      setUsers([]);
      return;
    }
    try {
      const companyUsers = await getUsersByCompany(currentUser.company);
      setUsers(
        companyUsers.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        )
      );
    } catch {
      toast.error('Failed to load users');
      setUsers([]);
    }
  }, [currentUser?.company]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function saveLocCode() {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUserDoc(editingUser.uid, { locCode });
      toast.success('Location code updated');
      setEditingUser(null);
      await loadUsers();
    } catch {
      toast.error('Failed to update location code');
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await updateUserDoc(removeTarget.uid, { company: '', role: 'user', locCode: null });
      toast.success('User removed from company');
      setRemoveTarget(null);
      await loadUsers();
    } catch {
      toast.error('Failed to remove user');
    } finally {
      setRemoving(false);
    }
  }

  const filtered = (users ?? []).filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${user.firstName} ${user.lastName}`.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/manager/" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to dashboard
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Company users</h1>
        <Input
          placeholder="Search by name…"
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
                  <TableHead>Role</TableHead>
                  <TableHead>Location code</TableHead>
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
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.locCode || 'Not set'}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setLocCode(user.locCode ?? '');
                        }}
                      >
                        Edit loc code
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={user.uid === currentUser?.uid}
                        onClick={() => setRemoveTarget(user)}
                      >
                        Remove
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

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit location code</DialogTitle>
            <DialogDescription>
              {editingUser
                ? `Set the billing location code for ${editingUser.firstName} ${editingUser.lastName}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Location code</Label>
            {isAcmeBrick ? (
              <Select value={locCode} onValueChange={(value) => setLocCode(value ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a location code" />
                </SelectTrigger>
                <SelectContent>
                  {ACME_BRICK_LOCATION_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={locCode} onChange={(e) => setLocCode(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveLocCode} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove User"
        message="Are you sure you want to remove this user from your company? This action cannot be undone."
        confirmText="Remove User"
        cancelText="Keep User"
        destructive
        busy={removing}
        onConfirm={removeUser}
      />
    </div>
  );
}
