'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useBorrowHistory, useReturnBook } from '@/features/borrow';
import { useAuth } from '@/features/auth';
import type { Book, BorrowStatus } from '@/types';

const statusVariant: Record<BorrowStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  returned: 'secondary',
  overdue: 'destructive',
};

export default function HistoryPage() {
  const [page, setPage] = useState(1);

  // ── In-page auth guard ───────────────────────────────────────────────────
  const { authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!authLoading && !authUser) router.replace('/login');
  }, [authUser, authLoading, router]);

  const { data, isLoading, isError } = useBorrowHistory(page);
  const returnBook = useReturnBook();

  const handleReturn = async (borrowId: string) => {
    try {
      await returnBook.mutateAsync(borrowId);
      toast.success('Book returned successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not return book.';
      toast.error(message);
    }
  };

  const getBookTitle = (bookId: string | Book) =>
    typeof bookId === 'object' ? bookId.title : bookId;

  return (
    <AppLayout>
      <PageHeader
        title="Borrow History"
        description="Your past and active borrows."
      />

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load history. Please refresh." />}

      {data && data.items.length === 0 && (
        <EmptyState
          title="No borrow records yet"
          description="Go to Dashboard and borrow your first book!"
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium">
                      {getBookTitle(record.bookId)}
                    </TableCell>
                    <TableCell>{format(new Date(record.borrowedAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{format(new Date(record.dueDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[record.status]}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.fine ? `$${record.fine.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>
                      {record.status === 'active' || record.status === 'overdue' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={returnBook.isPending}
                          onClick={() => handleReturn(record._id)}
                        >
                          Return
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
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
