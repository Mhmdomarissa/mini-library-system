import { Schema, model, Document, Types } from 'mongoose';

export type BookStatus = 'available' | 'out_of_stock' | 'archived';

export interface IBook extends Document {
  title: string;
  author: string;
  isbn: string;
  genre: string;
  description: string;
  publishedYear: number;
  totalCopies: number;
  availableCopies: number;
  status: BookStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    title:           { type: String, required: true },
    author:          { type: String, required: true },
    isbn:            { type: String, required: true, unique: true },
    genre:           { type: String, required: true },
    description:     { type: String, default: '' },
    publishedYear:   { type: Number, required: true },
    totalCopies:     { type: Number, required: true, min: 0 },
    availableCopies: { type: Number, required: true, min: 0 },
    status:          { type: String, enum: ['available', 'out_of_stock', 'archived'], default: 'available' },
    createdBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted:       { type: Boolean, default: false },
    deletedAt:       { type: Date, default: null },
  },
  { timestamps: true }
);

// Text indexes for search
bookSchema.index({ title: 'text', author: 'text' });
// Regular indexes
bookSchema.index({ genre: 1 });
bookSchema.index({ status: 1 });

export const Book = model<IBook>('Book', bookSchema);
