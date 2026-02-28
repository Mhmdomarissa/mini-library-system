'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PageHeader, LoadingSpinner, ErrorMessage, EmptyState } from '@/components/shared';
import { useBooks, useCreateBook, useDeleteBook } from '@/features/books';
import type { CreateBookPayload } from '@/types';

const schema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1),
  genre: z.string().min(1),
  publishedYear: z.coerce.number().min(1000).max(new Date().getFullYear()),
  totalCopies: z.coerce.number().min(1),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AdminBooksPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useBooks({ page, limit: 20 });
  const createBook = useCreateBook();
  const deleteBook = useDeleteBook();

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema) as unknown as import('react-hook-form').Resolver<FormValues>,
    defaultValues: {
      title: '',
      author: '',
      isbn: '',
      genre: '',
      publishedYear: new Date().getFullYear(),
      totalCopies: 1,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      await createBook.mutateAsync(values as CreateBookPayload);
      toast.success('Book created successfully!');
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create book.';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this book? This action cannot be undone.')) return;
    try {
      await deleteBook.mutateAsync(id);
      toast.success('Book deleted.');
    } catch {
      toast.error('Failed to delete book.');
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Manage Books"
        description="Add, edit, and remove books from the library."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Book</DialogTitle>
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
                    {form.formState.isSubmitting ? 'Creating…' : 'Create Book'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load books." />}

      {data && data.items.length === 0 && (
        <EmptyState title="No books yet" description="Add your first book above." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((book) => (
                  <TableRow key={book._id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{book.genre}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{book.isbn}</TableCell>
                    <TableCell>{book.totalCopies}</TableCell>
                    <TableCell>{book.availableCopies}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" disabled title="Edit (coming soon)">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(book._id)}
                          disabled={deleteBook.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} books total
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
