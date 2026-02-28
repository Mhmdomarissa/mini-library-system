import { useMutation } from '@tanstack/react-query';
import { chatService } from '../services';

/**
 * Mutation hook for POST /api/chat.
 * Does NOT manage the message list — that lives in the page component
 * so the conversation history is client-side only.
 */
export function useSendMessage() {
  return useMutation({
    mutationFn: (message: string) => chatService.sendMessage(message),
  });
}
