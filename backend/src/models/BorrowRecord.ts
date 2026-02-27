import type { Document, Types } from 'mongoose';
import { Schema, model } from 'mongoose';

export type BorrowStatus = 'borrowed' | 'returned' | 'overdue';

export interface IBorrowRecord extends Document {
  userId: Types.ObjectId;
  bookId: Types.ObjectId;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  status: BorrowStatus;
  createdAt: Date;
  updatedAt: Date;
}

const borrowRecordSchema = new Schema<IBorrowRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    borrowedAt: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['borrowed', 'returned', 'overdue'],
      default: 'borrowed',
      index: true,
    },
  },
  { timestamps: true },
);

// ── Duplicate Active Borrow Prevention ─────────────────────────────────────
// Only one active (status='borrowed') record per user+book pair.
// Partial index means the uniqueness constraint is lifted once the book is
// returned, allowing the same user to borrow the same book again later.
borrowRecordSchema.index(
  { userId: 1, bookId: 1 },
  { unique: true, partialFilterExpression: { status: 'borrowed' } },
);

// ── Query-Optimised Compound Indexes ───────────────────────────────────────
borrowRecordSchema.index({ userId: 1, status: 1 }); // GET /borrow/history
borrowRecordSchema.index({ bookId: 1, status: 1 }); // admin: which users have this book
borrowRecordSchema.index({ dueDate: 1, status: 1 }); // future overdue scanning job

export const BorrowRecord = model<IBorrowRecord>('BorrowRecord', borrowRecordSchema);
