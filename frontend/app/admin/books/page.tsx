'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SubmitHandler } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppLayout } from '@/components/layout';
import {
  PageHeader,
  ErrorMessage,
  EmptyState,
  TableSkeleton,
  PaginationControls,
  ConfirmDialog,
} from '@/components/shared';
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook, useDeleteBookFile } from '@/features/books';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/hooks/useDebounce';
import { env } from '@/lib/env';
import type { Book, CreateBookPayload, UpdateBookPayload } from '@/types';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().min(1, 'ISBN is required'),
  genre: z.string().min(1, 'Genre is required'),
  publishedYear: z.coerce.number().min(1000).max(new Date().getFullYear()),
  totalCopies: z.coerce.number().min(1),
  description: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

// ── Book Form Dialog ─────────────────────────────────────────────────────────

const ACCEPTED_FILE_TYPES = '.pdf,.html,.htm';
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

function BookFormDialog({
  open,
  onOpenChange,
  editingBook,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBook: Book | null;
}) {
  const createBook = useCreateBook();
  const updateBook = useUpdateBook(editingBook?._id ?? '');
  const deleteBookFile = useDeleteBookFile();
  const isEditing = Boolean(editingBook);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod v4 + @hookform/resolvers type mismatch
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema) as unknown as undefined,
    defaultValues: {
      title: '',
      author: '',
      isbn: '',
      genre: '',
      publishedYear: new Date().getFullYear(),
      totalCopies: 1,
      description: '',
    },
  });

  // Reset form when dialog opens/closes or editingBook changes
  useEffect(() => {
    if (open && editingBook) {
      form.reset({
        title: editingBook.title,
        author: editingBook.author,
        isbn: editingBook.isbn,
        genre: editingBook.genre,
        publishedYear: editingBook.publishedYear,
        totalCopies: editingBook.totalCopies,
        description: editingBook.description ?? '',
      });
    } else if (open && !editingBook) {
      form.reset({
        title: '',
        author: '',
        isbn: '',
        genre: '',
        publishedYear: new Date().getFullYear(),
        totalCopies: 1,
        description: '',
      });
    }
    // Clear selected file when dialog opens
    setSelectedFile(null);
  }, [open, editingBook, form]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = '';
      return;
    }

    const allowed = ['application/pdf', 'text/html'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF and HTML files are allowed.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveExistingFile = async () => {
    if (!editingBook?.fileId) return;
    try {
      await deleteBookFile.mutateAsync(editingBook._id);
      toast.success('File removed.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove file.';
      toast.error(message);
    }
  };

  const onSubmit: SubmitHandler<BookFormValues> = async (values) => {
    try {
      if (isEditing) {
        await updateBook.mutateAsync({ payload: values as UpdateBookPayload, file: selectedFile ?? undefined });
        toast.success('Book updated successfully!');
      } else {
        await createBook.mutateAsync({ payload: values as CreateBookPayload, file: selectedFile ?? undefined });
        toast.success('Book created successfully!');
      }
      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} book.`;
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Book' : 'Add New Book'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {(['title', 'author', 'isbn', 'genre'] as const).map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{field}</FormLabel>
                    <FormControl>
                      <Input {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="description"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description (used for AI semantic search)"
                      className="min-h-20 resize-none"
                      {...f}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="publishedYear"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalCopies"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Copies</FormLabel>
                    <FormControl>
                      <Input type="number" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── File Upload Section ────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Book File <span className="text-muted-foreground">(optional)</span>
              </label>

              {/* Show existing file if editing a book that has one */}
              {isEditing && editingBook?.fileId && !selectedFile && (
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{editingBook.fileName}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {editingBook.fileMimeType === 'application/pdf' ? 'PDF' : 'HTML'}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={handleRemoveExistingFile}
                    disabled={deleteBookFile.isPending}
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Show selected new file */}
              {selectedFile && (
                <div className="flex items-center justify-between rounded-md border bg-primary/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{selectedFile.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    title="Remove selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* File input — hidden, triggered by button */}
              {!selectedFile && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {isEditing && editingBook?.fileId ? 'Replace File' : 'Upload PDF or HTML'}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF or HTML, max {MAX_FILE_SIZE_MB} MB
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? (isEditing ? 'Updating…' : 'Creating…')
                : (isEditing ? 'Update Book' : 'Create Book')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Books Page ─────────────────────────────────────────────────────────

export default function AdminBooksPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  // ── In-page role guard (admin + librarian) ───────────────────────────────
  const { authUser, role, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) router.replace('/login');
    else if (role !== 'admin' && role !== 'librarian') router.replace('/dashboard');
  }, [authUser, role, authLoading, router]);

  const { data, isLoading, isError } = useBooks({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const deleteBook = useDeleteBook();

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBook(null);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBook.mutateAsync(deleteTarget._id);
      toast.success(`"${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete book.';
      toast.error(message);
    }
  };

  const statusVariant = (status: string) => {
    if (status === 'available') return 'default' as const;
    if (status === 'out_of_stock') return 'destructive' as const;
    return 'secondary' as const;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Manage Books"
        description="Add, edit, and remove books from the library."
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Book
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search books…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      <BookFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingBook={editingBook}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Book"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This will soft-delete the book and it will no longer appear in search results.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteBook.isPending}
        onConfirm={handleDeleteConfirm}
      />

      {isLoading && <TableSkeleton rows={8} columns={8} />}

      {isError && <ErrorMessage message="Failed to load books." />}

      {data && data.items.length === 0 && (
        <EmptyState
          title={debouncedSearch ? 'No matching books' : 'No books yet'}
          description={debouncedSearch ? 'Try a different search.' : 'Add your first book above.'}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead className="text-center">Copies</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((book) => (
                  <TableRow key={book._id} className="hover:bg-muted/40">
                    <TableCell>
                      <div>
                        <p className="font-medium">{book.title}</p>
                        {book.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{book.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{book.genre}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{book.isbn}</TableCell>
                    <TableCell className="text-center">{book.totalCopies}</TableCell>
                    <TableCell className="text-center">
                      <span className={book.availableCopies === 0 ? 'font-medium text-destructive' : ''}>
                        {book.availableCopies}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(book.status)}>
                        {book.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {book.fileId ? (
                        <a
                          href={`${env.apiUrl}/api/books/${book._id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {book.fileMimeType === 'application/pdf' ? 'PDF' : 'HTML'}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleEdit(book)}
                          title="Edit book"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {role === 'admin' && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(book)}
                            disabled={deleteBook.isPending}
                            title="Delete book"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            pagination={data.pagination}
            onPageChange={setPage}
            noun="book"
          />
        </>
      )}
    </AppLayout>
  );
}
