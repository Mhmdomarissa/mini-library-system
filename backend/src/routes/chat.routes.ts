import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { chatSchema } from '../utils/validationSchemas';
import * as chatController from '../controllers/chat.controller';

const router = Router();

/**
 * POST /api/chat
 * Role: any authenticated user (admin | librarian | member)
 *
 * Ask the AI librarian a question. Uses RAG:
 *   - Top 5 semantically similar books from the catalogue
 *   - Last 5 borrow records for personalised context
 *   - OpenAI gpt-4o-mini for the reply
 */
router.post('/', authenticate, validate(chatSchema), asyncHandler(chatController.chat));

export default router;
