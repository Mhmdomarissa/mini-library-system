'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAdminBorrows } from '@/features/admin';
import { useAuth } from '@/features/auth';
import type { Book, BorrowStatus, User } from '@/types';

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

  const getBookTitle = (bookId: string | Book) =>
    typeof bookId === 'object' ? bookId.title : bookId;

  const getUserEmail = (userId: string | User) =>
    typeof userId === 'object' ? userId.email : userId;

  const getDisplayStatus = (record: { status: BorrowStatus; computedStatus?: string }) =>
    (record.computedStatus ?? record.status) as string;

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

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load borrow records." />}

      {data && data.items.length === 0 && (
        <EmptyState title="No records found" description="No borrow records match the current filter." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((record) => {
                  const displayStatus = getDisplayStatus(record);
                  return (
                    <TableRow key={record._id}>
                      <TableCell className="text-sm">{getUserEmail(record.userId)}</TableCell>
                      <TableCell className="font-medium">{getBookTitle(record.bookId)}</TableCell>
                      <TableCell>{format(new Date(record.borrowedAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(record.dueDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[displayStatus] ?? 'default'}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.fine && record.fine > 0 ? (
                          <span className="font-medium text-destructive">
                            ${record.fine.toFixed(2)}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
              {' · '}
              {data.pagination.totalItems} record{data.pagination.totalItems !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data.pagination.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.pagination.hasNextPage}
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
