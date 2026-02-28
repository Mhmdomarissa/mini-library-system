'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout';
import { PageHeader, LoadingSpinner, ErrorMessage, EmptyState } from '@/components/shared';
import { useBooks, useSemanticSearch } from '@/features/books';
import { useBorrowBook } from '@/features/borrow';
import { useAuth } from '@/features/auth';

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── In-page auth guard ───────────────────────────────────────────────────
  const { authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!authLoading && !authUser) router.replace('/login');
  }, [authUser, authLoading, router]);

  // ── Data fetching ────────────────────────────────────────────────────────
  // Semantic search runs in parallel when 3+ chars are typed.
  // On 503 (embedding service down) it fails fast (retry:false) and we fall
  // back transparently to the regular paginated text search.
  const semanticEnabled = search.length >= 3;
  const { data: semanticResults, isError: isSemanticError, isFetching: isSemanticFetching } =
    useSemanticSearch(search);
  const { data, isLoading: isRegularLoading, isError: isRegularError } = useBooks({
    page,
    limit: 12,
    search: search || undefined,
  });

  const isUsingSemanticSearch = semanticEnabled && !isSemanticError && semanticResults !== undefined;
  const displayBooks = isUsingSemanticSearch ? semanticResults : data?.items ?? [];
  const isLoading = semanticEnabled ? isSemanticFetching && !isUsingSemanticSearch : isRegularLoading;
  const isError = isUsingSemanticSearch ? false : isRegularError;
  const showSemanticFallbackNotice = semanticEnabled && isSemanticError;

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
      <div className="mb-6 flex items-center gap-2">
        <Input
          placeholder="Search by title, author, genre…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        {isUsingSemanticSearch && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> AI search
          </span>
        )}
        {showSemanticFallbackNotice && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" /> AI search unavailable — showing text results
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load books. Please refresh." />}

      {!isLoading && displayBooks.length === 0 && (
        <EmptyState title="No books found" description="Try a different search." />
      )}

      {displayBooks.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayBooks.map((book) => (
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

          {/* Pagination — hidden when showing semantic search results */}
          {!isUsingSemanticSearch && data && (
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
          )}
        </>
      )}
    </AppLayout>
  );
}
