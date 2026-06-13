'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
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
import { deleteCompany, getAllCompanies, upsertCompany } from '@/lib/services/companies';
import { getImageDimensions, uploadImage } from '@/lib/services/storage';
import type { Company, CompanyLogo } from '@/lib/types';

interface EmbroideryUpload {
  id: string;
  name: string;
  preview: string;
  file?: File;
  existing?: CompanyLogo;
}

interface EditorState {
  company: Company | null; // null = create mode
  id: string;
  displayName: string;
  emailDomain: string;
  mainLogoFile: File | null;
  mainLogoPreview: string | null;
  embroidery: EmbroideryUpload[];
}

const EMPTY_EDITOR: EditorState = {
  company: null,
  id: '',
  displayName: '',
  emailDomain: '',
  mainLogoFile: null,
  mainLogoPreview: null,
  embroidery: [],
};

export function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCompanies() {
    setCompanies(
      (await getAllCompanies()).sort((a, b) => a.displayName.localeCompare(b.displayName))
    );
  }

  useEffect(() => {
    loadCompanies().catch(() => toast.error('Failed to load companies'));
  }, []);

  function openEditor(company: Company | null) {
    setEditor(
      company
        ? {
            company,
            id: company.id,
            displayName: company.displayName,
            emailDomain: company.emailDomain,
            mainLogoFile: null,
            mainLogoPreview: company.mainLogo?.imageUrl || null,
            embroidery: (company.embroideryLogos ?? []).map((logo) => ({
              id: logo.id,
              name: logo.name,
              preview: logo.imageUrl,
              existing: logo,
            })),
          }
        : { ...EMPTY_EDITOR }
    );
  }

  function handleMainLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () =>
      setEditor((state) =>
        state ? { ...state, mainLogoFile: file, mainLogoPreview: reader.result as string } : state
      );
    reader.readAsDataURL(file);
  }

  function handleEmbroideryLogos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !editor) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setEditor((state) =>
          state
            ? {
                ...state,
                embroidery: [
                  ...state.embroidery,
                  {
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    preview: reader.result as string,
                    file,
                  },
                ],
              }
            : state
        );
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  async function save() {
    if (!editor) return;
    const isNew = !editor.company;
    const companyId = isNew ? editor.id.trim() : editor.company!.id;

    if (isNew && !/^[a-z0-9-]+$/.test(companyId)) {
      toast.error('Company ID must be lowercase letters, numbers, and dashes');
      return;
    }
    if (!editor.displayName.trim() || !editor.emailDomain.trim()) {
      toast.error('Display name and email domain are required');
      return;
    }
    if (!editor.mainLogoFile && !editor.mainLogoPreview) {
      toast.error('Main logo is required');
      return;
    }

    setSaving(true);
    try {
      let mainLogo = editor.company?.mainLogo ?? { imageUrl: '', width: 0, height: 0 };
      if (editor.mainLogoFile) {
        const dimensions = await getImageDimensions(editor.mainLogoFile);
        const imageUrl = await uploadImage(`companies/${companyId}/main-logo`, editor.mainLogoFile);
        mainLogo = { imageUrl, ...dimensions };
      }

      const embroideryLogos: CompanyLogo[] = [];
      for (const logo of editor.embroidery) {
        if (logo.existing) {
          embroideryLogos.push(logo.existing);
        } else if (logo.file) {
          const dimensions = await getImageDimensions(logo.file);
          const imageUrl = await uploadImage(
            `companies/${companyId}/embroidery-logos/${logo.id}`,
            logo.file
          );
          embroideryLogos.push({ id: logo.id, name: logo.name, imageUrl, ...dimensions });
        }
      }

      await upsertCompany(
        companyId,
        {
          displayName: editor.displayName.trim(),
          emailDomain: editor.emailDomain.trim().toLowerCase(),
          mainLogo,
          embroideryLogos,
        },
        isNew
      );
      toast.success(isNew ? 'Company created' : 'Company updated');
      setEditor(null);
      await loadCompanies();
    } catch {
      toast.error('Failed to save company');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompany(deleteTarget.id);
      toast.success('Company deleted');
      setDeleteTarget(null);
      await loadCompanies();
    } catch {
      toast.error('Failed to delete company');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to admin
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <Button size="sm" onClick={() => openEditor(null)}>
          <Plus className="mr-1 h-4 w-4" />
          New company
        </Button>
      </div>

      {companies === null ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email Domain</TableHead>
                  <TableHead>Embroidery Logos</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      {company.mainLogo?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={company.mainLogo.imageUrl}
                          alt={company.displayName}
                          className="h-8 w-auto object-contain"
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{company.id}</TableCell>
                    <TableCell className="font-medium">{company.displayName}</TableCell>
                    <TableCell>{company.emailDomain}</TableCell>
                    <TableCell>{company.embroideryLogos?.length ?? 0}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => openEditor(company)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(company)}
                        aria-label="Delete company"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {companies.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No companies yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor?.company ? 'Edit company' : 'New company'}</DialogTitle>
            <DialogDescription>
              Users are matched to this company by their email domain.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyId">Company ID</Label>
                <Input
                  id="companyId"
                  placeholder="acme-brick"
                  value={editor.id}
                  disabled={!!editor.company}
                  onChange={(e) => setEditor({ ...editor, id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={editor.displayName}
                  onChange={(e) => setEditor({ ...editor, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailDomain">Email domain</Label>
                <Input
                  id="emailDomain"
                  placeholder="acmebrick.com"
                  value={editor.emailDomain}
                  onChange={(e) => setEditor({ ...editor, emailDomain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Main logo</Label>
                {editor.mainLogoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editor.mainLogoPreview}
                    alt="Main logo preview"
                    className="h-16 w-auto rounded border object-contain p-1"
                  />
                )}
                <Input type="file" accept="image/*" onChange={handleMainLogo} />
              </div>
              <div className="space-y-2">
                <Label>Embroidery logos</Label>
                {editor.embroidery.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editor.embroidery.map((logo) => (
                      <div key={logo.id} className="relative rounded border p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logo.preview}
                          alt={logo.name}
                          className="h-14 w-14 object-contain"
                        />
                        <button
                          type="button"
                          className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5"
                          onClick={() =>
                            setEditor({
                              ...editor,
                              embroidery: editor.embroidery.filter((l) => l.id !== logo.id),
                            })
                          }
                          aria-label={`Remove ${logo.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="max-w-14 truncate text-[10px] text-muted-foreground">
                          {logo.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Input type="file" accept="image/*" multiple onChange={handleEmbroideryLogos} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Company"
        message={`Are you sure you want to delete "${deleteTarget?.displayName ?? ''}"? Users assigned to it will lose access to its catalog.`}
        confirmText="Delete"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
