'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
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
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from '@/features/books';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/hooks/useDebounce';
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
  const isEditing = Boolean(editingBook);

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
  }, [open, editingBook, form]);

  const onSubmit: SubmitHandler<BookFormValues> = async (values) => {
    try {
      if (isEditing) {
        await updateBook.mutateAsync(values as UpdateBookPayload);
        toast.success('Book updated successfully!');
      } else {
        await createBook.mutateAsync(values as CreateBookPayload);
        toast.success('Book created successfully!');
      }
      form.reset();
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((book) => (
                  <TableRow key={book._id}>
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
