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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    borrowedAt: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
    status: { type: String, enum: ['borrowed', 'returned', 'overdue'], default: 'borrowed' },
  },
  { timestamps: true },
);

borrowRecordSchema.index({ userId: 1 });
borrowRecordSchema.index({ bookId: 1 });
borrowRecordSchema.index({ status: 1 });
borrowRecordSchema.index({ userId: 1, status: 1 }); // compound: my borrows by status
borrowRecordSchema.index({ dueDate: 1, status: 1 }); // compound: overdue detection query

export const BorrowRecord = model<IBorrowRecord>('BorrowRecord', borrowRecordSchema);
