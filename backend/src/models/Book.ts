import type { Document, Types } from 'mongoose';
import { Schema, model } from 'mongoose';

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
  /** OpenAI text-embedding-3-small vector (1536-dim). Excluded from all standard queries via select:false. */
  embedding?: number[];
  /** GridFS ObjectId of the associated file (PDF/HTML). */
  fileId?: Types.ObjectId;
  /** Original filename of the uploaded file. */
  fileName?: string;
  /** MIME type of the uploaded file (application/pdf | text/html). */
  fileMimeType?: string;
}

const bookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, required: true },
    genre: { type: String, required: true },
    description: { type: String, default: '' },
    publishedYear: { type: Number, required: true },
    totalCopies: { type: Number, required: true, min: 0 },
    availableCopies: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['available', 'out_of_stock', 'archived'], default: 'available' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    // ── Semantic search vector ────────────────────────────────────────────
    // OpenAI text-embedding-3-small output (1536 floats).
    // select:false → excluded from every query unless explicitly requested
    //   with .select('+embedding'). Keeps payloads lean and prevents
    //   accidental exposure of embeddings in public-facing responses.
    // Not indexed — cosine similarity is computed in-memory in the service.
    // Not required — existing books may lack an embedding until regenerated.
    embedding: { type: [Number], required: false, select: false },
    // ── Associated file (PDF / HTML) ──────────────────────────────────────
    // Stored in GridFS (bookFiles bucket). Only the reference is kept here.
    // fileId is the GridFS ObjectId, fileName the original name, fileMimeType
    // the validated MIME type. All optional — books can exist without a file.
    fileId: { type: Schema.Types.ObjectId, required: false },
    fileName: { type: String, required: false },
    fileMimeType: { type: String, required: false },
  },
  { timestamps: true },
);

// Compound text index — only ONE text index allowed per collection
bookSchema.index(
  { title: 'text', author: 'text', description: 'text' },
  { weights: { title: 10, author: 5, description: 1 } },
);
// Soft-delete filter — virtually every query includes isDeleted: false
bookSchema.index({ isDeleted: 1 });
// Common list/filter queries
bookSchema.index({ genre: 1 });
bookSchema.index({ status: 1 });
// Compound: status + genre for filtered catalog pages
bookSchema.index({ status: 1, genre: 1 });
// Partial unique index on ISBN — only enforced for non-deleted documents,
// so a soft-deleted book's ISBN can be reused by a new book.
bookSchema.index({ isbn: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// isbn unique is enforced at field level (unique: true) — no extra index needed

export const Book = model<IBook>('Book', bookSchema);
