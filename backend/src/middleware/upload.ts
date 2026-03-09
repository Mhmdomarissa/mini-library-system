import multer from 'multer';
import { MAX_FILE_SIZE } from '../services/storage.service';

/**
 * Multer middleware — memory storage for GridFS pipeline.
 *
 * Files are held in memory (Buffer) and then streamed to GridFS in the
 * controller/service layer. Memory storage avoids writing temp files to
 * Railway's ephemeral filesystem.
 *
 * Constraints:
 *   - Max file size: 50 MB
 *   - Allowed MIME types: PDF, HTML
 *   - Single file field name: "file"
 */

const ALLOWED_MIME_TYPES = ['application/pdf', 'text/html'];

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      ),
    );
  }
};

/**
 * Single file upload middleware.
 * Field name: "file"
 * Attach to routes that accept book file uploads.
 *
 * After this middleware:
 *   req.file — Multer file object (buffer, originalname, mimetype, size)
 *   req.body — text fields from the multipart form (JSON-parsed by controller)
 */
export const uploadBookFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');
