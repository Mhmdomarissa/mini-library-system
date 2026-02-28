import { api } from '@/lib/api';
import type { ChatApiResponse } from '@/types';

export const chatService = {
  /** POST /api/chat — sends a user message and returns the AI reply + sources */
  sendMessage: (message: string): Promise<ChatApiResponse> =>
    api.post<ChatApiResponse>('/api/chat', { message }),
};
