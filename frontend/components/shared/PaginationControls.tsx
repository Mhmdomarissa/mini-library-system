'use client';

import { Button } from '@/components/ui/button';
import type { Pagination } from '@/types';

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  noun?: string;
}

/**
 * Reusable pagination footer with page info and prev/next buttons.
 * Extracts the duplicated pattern from every paginated page.
 */
export function PaginationControls({ pagination, onPageChange, noun = 'item' }: PaginationControlsProps) {
  const plural = pagination.totalItems !== 1 ? `${noun}s` : noun;

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages}
        {' · '}
        {pagination.totalItems} {plural}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPrevPage}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
