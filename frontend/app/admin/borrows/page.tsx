'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
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
  ConfirmDialog,
} from '@/components/shared';
import { useAdminBorrows } from '@/features/admin';
import { useReturnBook } from '@/features/borrow';
import { useAuth } from '@/features/auth';
import { useQueryClient } from '@tanstack/react-query';
import type { Book, BorrowRecord, BorrowStatus, User } from '@/types';

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

export default function AdminBorrowsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | undefined>(undefined);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [returnTarget, setReturnTarget] = useState<BorrowRecord | null>(null);

  // ── Role guard (admin + librarian) ───────────────────────────────────────
  const { authUser, role, loading: authLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) router.replace('/login');
    else if (role !== 'admin' && role !== 'librarian') router.replace('/dashboard');
  }, [authUser, role, authLoading, router]);

  const { data, isLoading, isError } = useAdminBorrows({
    page,
    limit: 20,
    status: overdueOnly ? undefined : statusFilter,
    overdue: overdueOnly || undefined,
  });

  const returnBook = useReturnBook();
  const qc = useQueryClient();

  const handleReturnConfirm = async () => {
    if (!returnTarget) return;
    try {
      const { borrowRecord } = await returnBook.mutateAsync(returnTarget._id);
      // Also invalidate admin borrow list
      qc.invalidateQueries({ queryKey: ['admin-borrows'] });

      if (borrowRecord.daysOverdue && borrowRecord.daysOverdue > 0) {
        toast.warning(
          `Returned ${getBookTitle(returnTarget.bookId)} — ${borrowRecord.daysOverdue} day(s) overdue · Fine: $${(borrowRecord.fine ?? 0).toFixed(2)}`,
        );
      } else {
        toast.success(`Returned "${getBookTitle(returnTarget.bookId)}" successfully.`);
      }
      setReturnTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to return book.';
      toast.error(message);
    }
  };

  const getBookTitle = (bookId: string | Book) =>
    typeof bookId === 'object' ? bookId.title : bookId;

  const getUserEmail = (userId: string | User) =>
    typeof userId === 'object' ? userId.email : userId;

  const getDisplayStatus = (record: { status: BorrowStatus; computedStatus?: string }) =>
    (record.computedStatus ?? record.status) as string;

  const isActive = (record: BorrowRecord) => {
    const s = getDisplayStatus(record);
    return s === 'borrowed' || s === 'overdue';
  };

  return (
    <AppLayout>
      <PageHeader
        title="All Borrows"
        description="View and manage all borrow records across users."
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.label}
            variant={!overdueOnly && statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setOverdueOnly(false);
              setStatusFilter(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
        <div className="mx-2 h-6 w-px bg-border" />
        <Button
          variant={overdueOnly ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => {
            setOverdueOnly(!overdueOnly);
            setStatusFilter(undefined);
            setPage(1);
          }}
        >
          Overdue Only
        </Button>
      </div>

      <ConfirmDialog
        open={returnTarget !== null}
        onOpenChange={(open) => { if (!open) setReturnTarget(null); }}
        title="Return Book"
        description={`Mark "${returnTarget ? getBookTitle(returnTarget.bookId) : ''}" as returned on behalf of ${returnTarget ? getUserEmail(returnTarget.userId) : ''}?`}
        confirmLabel="Return"
        variant="default"
        loading={returnBook.isPending}
        onConfirm={handleReturnConfirm}
      />

      {isLoading && <TableSkeleton rows={8} columns={7} />}

      {isError && <ErrorMessage message="Failed to load borrow records." />}

      {data && data.items.length === 0 && (
        <EmptyState title="No records found" description="No borrow records match the current filter." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
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
                  const overdue = displayStatus === 'overdue';
                  return (
                    <TableRow key={record._id} className={overdue ? 'bg-destructive/5' : undefined}>
                      <TableCell className="text-sm">{getUserEmail(record.userId)}</TableCell>
                      <TableCell className="font-medium">{getBookTitle(record.bookId)}</TableCell>
                      <TableCell>{format(new Date(record.borrowedAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(record.dueDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        {record.returnedAt
                          ? format(new Date(record.returnedAt), 'dd MMM yyyy')
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={statusVariant[displayStatus] ?? 'default'}>
                            {displayStatus}
                          </Badge>
                          {overdue && record.daysOverdue && (
                            <span className="flex items-center gap-0.5 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {record.daysOverdue}d
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.fine && record.fine > 0 ? (
                          <span className="font-medium text-destructive">
                            ${record.fine.toFixed(2)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isActive(record) && (
                          <Button
                            size="sm"
                            variant={overdue ? 'destructive' : 'outline'}
                            onClick={() => setReturnTarget(record)}
                            disabled={returnBook.isPending}
                          >
                            {returnBook.isPending && returnTarget?._id === record._id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-1 h-3 w-3" />
                            )}
                            Return
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
