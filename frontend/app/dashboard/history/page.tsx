'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertCircle, Loader2 } from 'lucide-react';
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
import {
  PageHeader,
  ErrorMessage,
  EmptyState,
  TableSkeleton,
  PaginationControls,
} from '@/components/shared';
import { useBorrowHistory, useReturnBook } from '@/features/borrow';
import { useAuth } from '@/features/auth';
import type { Book, BorrowRecord, BorrowStatus } from '@/types';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  borrowed: 'default',
  returned: 'secondary',
  overdue: 'destructive',
};

const STATUS_FILTERS: { label: string; value: BorrowStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Borrowed', value: 'borrowed' },
  { label: 'Returned', value: 'returned' },
  { label: 'Overdue', value: 'overdue' },
];

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | undefined>(undefined);

  // ── In-page auth guard ───────────────────────────────────────────────────
  const { authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!authLoading && !authUser) router.replace('/login');
  }, [authUser, authLoading, router]);

  const { data, isLoading, isError } = useBorrowHistory({ page, status: statusFilter });
  const returnBook = useReturnBook();

  const handleReturn = async (borrowId: string) => {
    try {
      const result = await returnBook.mutateAsync(borrowId);
      const record = result.borrowRecord;
      if (record.fine && record.fine > 0) {
        toast.warning('Book returned with a fine', {
          description: `${record.daysOverdue} day${record.daysOverdue !== 1 ? 's' : ''} overdue · Fine: $${record.fine.toFixed(2)}`,
        });
      } else {
        toast.success('Book returned successfully!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not return book.';
      toast.error(message);
    }
  };

  const getBookTitle = (bookId: string | Book) =>
    typeof bookId === 'object' ? bookId.title : bookId;

  /** Display the computed status (overdue detection) or raw status */
  const getDisplayStatus = (record: BorrowRecord) =>
    (record.computedStatus ?? record.status) as string;

  return (
    <AppLayout>
      <PageHeader
        title="Borrow History"
        description="Your past and active borrows."
      />

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.label}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && <TableSkeleton rows={5} columns={7} />}

      {isError && <ErrorMessage message="Failed to load history. Please refresh." />}

      {data && data.items.length === 0 && (
        <EmptyState
          title="No borrow records yet"
          description={statusFilter ? 'No records match this filter.' : 'Go to Dashboard and borrow your first book!'}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((record) => {
                  const displayStatus = getDisplayStatus(record);
                  const isActive = displayStatus === 'borrowed' || displayStatus === 'overdue';
                  const isOverdue = displayStatus === 'overdue';
                  return (
                    <TableRow key={record._id} className={isOverdue ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        {getBookTitle(record.bookId)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(record.borrowedAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(record.dueDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.returnedAt
                          ? format(new Date(record.returnedAt), 'dd MMM yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={statusVariant[displayStatus] ?? 'default'}>
                            {displayStatus}
                          </Badge>
                          {isOverdue && record.daysOverdue && record.daysOverdue > 0 && (
                            <span className="flex items-center gap-0.5 text-xs font-medium text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {record.daysOverdue}d
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.fine && record.fine > 0 ? (
                          <span className="font-semibold text-destructive">
                            ${record.fine.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isActive && (
                          <Button
                            size="sm"
                            variant={isOverdue ? 'destructive' : 'outline'}
                            disabled={returnBook.isPending}
                            onClick={() => handleReturn(record._id)}
                          >
                            {returnBook.isPending
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : 'Return'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            pagination={data.pagination}
            onPageChange={setPage}
            noun="record"
          />
        </>
      )}
    </AppLayout>
  );
}
