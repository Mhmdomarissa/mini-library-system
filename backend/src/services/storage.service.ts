import mongoose from 'mongoose';
import { Readable } from 'stream';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * StorageService — file management via MongoDB GridFS.
 *
 * GridFS stores files as chunked documents inside the existing MongoDB instance.
 * No external storage service required — files live in `bookFiles.files` and
 * `bookFiles.chunks` collections.
 *
 * Allowed MIME types: PDF and HTML only.
 * Max file size: 50 MB (enforced by the upload middleware, not here).
 */

const BUCKET_NAME = 'bookFiles';

const ALLOWED_MIME_TYPES = ['application/pdf', 'text/html'];

/** Maximum file size in bytes (50 MB). */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getBucket(): mongoose.mongo.GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw AppError.internal('Database not connected');
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export class StorageService {
  /**
   * Upload a file buffer to GridFS.
   *
   * @param buffer   — raw file bytes (from multer memory storage)
   * @param filename — original file name
   * @param mimeType — MIME type of the file
   * @param bookId   — associated book ObjectId (stored in metadata)
   * @returns        — GridFS file ObjectId
   */
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    bookId: string,
  ): Promise<mongoose.Types.ObjectId> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw AppError.badRequest(
        `Unsupported file type "${mimeType}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const bucket = getBucket();
    const readable = Readable.from(buffer);

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { contentType: mimeType, bookId },
    });

    return new Promise<mongoose.Types.ObjectId>((resolve, reject) => {
      readable
        .pipe(uploadStream)
        .on('finish', () => {
          logger.info('File uploaded to GridFS', {
            fileId: uploadStream.id,
            filename,
            mimeType,
            bookId,
          });
          resolve(uploadStream.id);
        })
        .on('error', (err) => {
          logger.error('GridFS upload failed', { error: err.message, filename });
          reject(AppError.internal('File upload failed'));
        });
    });
  }

  /**
   * Download a file from GridFS as a readable stream.
   *
   * @param fileId — GridFS file ObjectId
   * @returns      — { stream, filename, contentType }
   */
  async download(fileId: mongoose.Types.ObjectId): Promise<{
    stream: NodeJS.ReadableStream;
    filename: string;
    contentType: string;
  }> {
    const bucket = getBucket();

    // Verify the file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      throw AppError.notFound('File not found');
    }

    const file = files[0];
    const stream = bucket.openDownloadStream(fileId);

    return {
      stream,
      filename: file.filename,
      contentType: (file.metadata?.contentType as string) ?? 'application/octet-stream',
    };
  }

  /**
   * Delete a file from GridFS.
   * Silently succeeds if the file doesn't exist (idempotent).
   */
  async delete(fileId: mongoose.Types.ObjectId): Promise<void> {
    const bucket = getBucket();
    try {
      await bucket.delete(fileId);
      logger.info('File deleted from GridFS', { fileId });
    } catch {
      // GridFS throws if file not found — treat as success (idempotent)
      logger.warn('GridFS delete — file not found (already deleted?)', { fileId });
    }
  }
}

// Singleton
export const storageService = new StorageService();
