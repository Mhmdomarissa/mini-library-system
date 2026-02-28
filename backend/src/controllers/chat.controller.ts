import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { chatService } from '../services/chat.service';
import type { ChatInput } from '../utils/validationSchemas';
import { sendSuccess } from '../utils/response';

/**
 * POST /api/chat
 * Role: any authenticated user
 *
 * Sends the user's message to the AI librarian and returns a reply + sources.
 * The service handles embedding, retrieval, history lookup, and GPT completion.
 */
export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as ChatInput;
  const userId = req.user!._id as Types.ObjectId;

  const result = await chatService.chat(message, userId);

  sendSuccess(res, result);
};
