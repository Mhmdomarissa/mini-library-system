'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout';
import { PageHeader, LoadingSpinner, ErrorMessage, EmptyState } from '@/components/shared';
import { useBooks } from '@/features/books';
import { useBorrowBook } from '@/features/borrow';

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useBooks({ page, limit: 12, search: search || undefined });
  const borrowBook = useBorrowBook();

  const handleBorrow = async (bookId: string) => {
    try {
      await borrowBook.mutateAsync(bookId);
      toast.success('Book borrowed! Return within 14 days.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not borrow book.';
      toast.error(message);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Browse Books"
        description="Search and borrow from our collection."
      />

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Search by title, author, genre…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load books. Please refresh." />}

      {data && data.items.length === 0 && (
        <EmptyState title="No books found" description="Try a different search." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((book) => (
              <Card key={book._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-base">{book.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{book.genre}</Badge>
                    <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'}>
                      {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Unavailable'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    disabled={book.availableCopies === 0 || borrowBook.isPending}
                    onClick={() => handleBorrow(book._id)}
                  >
                    Borrow
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
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
