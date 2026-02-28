'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout';
import {
  PageHeader,
  ErrorMessage,
  EmptyState,
  BookCardGridSkeleton,
  PaginationControls,
} from '@/components/shared';
import { useBooks, useSemanticSearch } from '@/features/books';
import { useBorrowBook } from '@/features/borrow';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/hooks/useDebounce';
import { ApiError } from '@/lib/api';

const GENRE_FILTERS = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Fantasy', 'Romance', 'Technology', 'Philosophy', 'Biography'] as const;

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  // ── In-page auth guard ───────────────────────────────────────────────────
  const { authUser, role, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!authLoading && !authUser) router.replace('/login');
  }, [authUser, authLoading, router]);

  // ── Data fetching ────────────────────────────────────────────────────────
  // Semantic search runs in parallel when 3+ chars are typed (debounced).
  // On 503 (embedding service down) it fails fast (retry:false) and we fall
  // back transparently to the regular paginated text search.
  const semanticEnabled = debouncedSearch.length >= 3;
  const { data: semanticResults, isError: isSemanticError, isFetching: isSemanticFetching } =
    useSemanticSearch(debouncedSearch);
  const { data, isLoading: isRegularLoading, isError: isRegularError, isFetching: isRegularFetching } = useBooks({
    page,
    limit: 12,
    search: debouncedSearch || undefined,
    genre: genre || undefined,
  });

  const isUsingSemanticSearch = semanticEnabled && !isSemanticError && semanticResults !== undefined;
  const displayBooks = isUsingSemanticSearch ? semanticResults : data?.items ?? [];
  const isLoading = semanticEnabled ? isSemanticFetching && !isUsingSemanticSearch : isRegularLoading;
  const isError = isUsingSemanticSearch ? false : isRegularError;
  const showSemanticFallbackNotice = semanticEnabled && isSemanticError;
  const isSearching = debouncedSearch !== search; // still waiting for debounce

  const borrowBook = useBorrowBook();

  const handleBorrow = async (bookId: string) => {
    try {
      const result = await borrowBook.mutateAsync(bookId);
      toast.success(result.message || 'Book borrowed! Return within 14 days.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.message.toLowerCase().includes('limit')) {
          toast.error('Borrow limit reached', {
            description: err.message,
          });
        } else if (err.status === 409) {
          toast.warning('You already have this book borrowed.');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Could not borrow book. Please try again.');
      }
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Browse Books"
        description="Search and borrow from our collection."
      />

      {/* Search + Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, genre…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          {(isSearching || (semanticEnabled && isSemanticFetching)) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {isUsingSemanticSearch && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Sparkles className="h-3 w-3" /> AI search
            </span>
          )}
          {showSemanticFallbackNotice && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              <AlertTriangle className="h-3 w-3" /> AI unavailable — text results
            </span>
          )}
        </div>

        {/* Genre filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {GENRE_FILTERS.map((g) => {
            const value = g === 'All' ? undefined : g;
            const isActive = genre === value;
            return (
              <Button
                key={g}
                variant={isActive ? 'default' : 'outline'}
                size="xs"
                onClick={() => { setGenre(value); setPage(1); }}
              >
                {g}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading && <BookCardGridSkeleton count={6} />}

      {isError && <ErrorMessage message="Failed to load books. Please refresh." />}

      {!isLoading && !isError && displayBooks.length === 0 && (
        <EmptyState
          title="No books found"
          description={
            debouncedSearch || genre
              ? 'Try a different search or clear filters.'
              : 'The library is empty. Check back later!'
          }
        />
      )}

      {!isLoading && displayBooks.length > 0 && (
        <>
          {/* Background refresh indicator */}
          {isRegularFetching && !isRegularLoading && (
            <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayBooks.map((book) => (
              <Card key={book._id} className="group flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-1 text-base group-hover:text-primary transition-colors">{book.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                    {book.publishedYear && (
                      <span className="shrink-0 text-xs text-muted-foreground">{book.publishedYear}</span>
                    )}
                  </div>
                  {book.description && (
                    <CardDescription className="line-clamp-2 text-xs">
                      {book.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{book.genre}</Badge>
                    <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'}>
                      {book.availableCopies > 0
                        ? `${book.availableCopies} avail.`
                        : 'Unavailable'}
                    </Badge>
                  </div>
                  {role === 'member' ? (
                    <Button
                      size="sm"
                      disabled={book.availableCopies === 0 || (borrowBook.isPending && borrowBook.variables === book._id)}
                      onClick={() => handleBorrow(book._id)}
                    >
                      {borrowBook.isPending && borrowBook.variables === book._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Borrow'}
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button size="sm" disabled>
                            Borrow
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Only members can borrow books</TooltipContent>
                    </Tooltip>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination — hidden when showing semantic search results */}
          {!isUsingSemanticSearch && data && (
            <PaginationControls
              pagination={data.pagination}
              onPageChange={setPage}
              noun="book"
            />
          )}
        </>
      )}
    </AppLayout>
  );
}
