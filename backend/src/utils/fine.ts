/**
 * Fine calculation utility.
 *
 * Rules:
 *  - If returnedAt is null  -> compare dueDate against now (UTC)
 *  - If returnedAt exists   -> compare returnedAt against dueDate
 *  - daysOverdue uses Math.ceil so a partial day counts as a full day
 *  - fine is never negative
 *  - All date arithmetic uses UTC milliseconds to avoid timezone drift
 */

export interface FineResult {
  daysOverdue: number;
  fine: number;
}

export function calculateFine(dueDate: Date, returnedAt: Date | null): FineResult {
  const finePerDay = parseFloat(process.env.FINE_PER_DAY ?? '1');

  // Reference point: when was the book settled?
  const settledAt: Date = returnedAt ?? new Date();

  const diffMs = settledAt.getTime() - dueDate.getTime();

  if (diffMs <= 0) {
    return { daysOverdue: 0, fine: 0 };
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.ceil(diffMs / MS_PER_DAY);
  const fine = daysOverdue * finePerDay;

  return { daysOverdue, fine };
}
