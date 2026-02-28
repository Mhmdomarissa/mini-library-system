import OpenAI from 'openai';
import type { Types } from 'mongoose';
import { bookService } from './book.service';
import { borrowService } from './borrow.service';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// ── Lazily-initialised OpenAI client (same pattern as embedding.service) ───
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw AppError.serviceUnavailable('OpenAI API key is not configured');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatSource {
  id: string;
  title: string;
  author: string;
  genre: string;
}

export interface ChatResult {
  reply: string;
  sources: ChatSource[];
}

// ── System prompt ──────────────────────────────────────────────────────────
// Keep the prompt concise — every token costs money at inference time.

const SYSTEM_PROMPT = `You are a helpful librarian assistant for the Mini Library System.
You help users discover books, check availability, and answer questions about reading.
Use the provided catalogue context and the user's borrow history to personalise your answers.
Keep responses concise (2-4 sentences unless the user asks for more detail).
If no relevant books are found in context, say so honestly rather than inventing titles.`;

class ChatService {
  /**
   * Answer a user's natural-language question using RAG:
   *  1. Embed the message → find top 5 similar books in the catalogue
   *  2. Fetch the user's last 5 borrow records for personalised context
   *  3. Call gpt-4o-mini with a context-enriched prompt
   *  4. Return { reply, sources }
   */
  async chat(message: string, userId: Types.ObjectId): Promise<ChatResult> {
    // ── 1. Retrieve relevant books (semantic search) ───────────────────────
    // semanticSearch embeds the query and scores books by cosine similarity.
    // Returns up to 5 books without embedding vectors.
    let similarBooks: Awaited<ReturnType<typeof bookService.semanticSearch>> = [];
    try {
      similarBooks = await bookService.semanticSearch(message, 5);
    } catch (err) {
      // If OpenAI is unavailable for embedding, surface 503 immediately.
      if (err instanceof AppError) throw err;
      logger.error('Semantic search failed during chat', {
        message: err instanceof Error ? err.message : String(err),
      });
      throw AppError.serviceUnavailable('Chat service temporarily unavailable');
    }

    // ── 2. Retrieve the user's recent borrow history ───────────────────────
    let recentBorrows: { title: string; author: string; status: string }[] = [];
    try {
      const history = await borrowService.myHistory(userId, {}, { page: 1, limit: 5, skip: 0 });

      // bookId is populated at runtime even though the type says ObjectId
      recentBorrows = history.items.map((item) => {
        const book = item.bookId as unknown as { title?: string; author?: string } | null;
        return {
          title: book?.title ?? 'Unknown',
          author: book?.author ?? 'Unknown',
          status: item.status,
        };
      });
    } catch {
      // Non-critical: proceed without history context if it fails
      logger.warn('Failed to load borrow history for chat context', { userId });
    }

    // ── 3. Build context string ────────────────────────────────────────────
    const bookContext =
      similarBooks.length > 0
        ? similarBooks
            .map(
              (b, i) =>
                `${i + 1}. "${(b as { title: string }).title}" by ${(b as { author: string }).author}` +
                ` (${(b as { genre: string }).genre}) — ${(b as { status: string }).status}`,
            )
            .join('\n')
        : 'No closely matching books found in the catalogue.';

    const historyContext =
      recentBorrows.length > 0
        ? recentBorrows.map((r) => `- "${r.title}" by ${r.author} (${r.status})`).join('\n')
        : 'No recent borrow history.';

    const contextBlock = [
      '=== Relevant catalogue books ===',
      bookContext,
      '',
      "=== User's recent borrows ===",
      historyContext,
    ].join('\n');

    // ── 4. Call OpenAI chat completion ────────────────────────────────────
    let reply: string;
    try {
      const completion = await getClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${contextBlock}\n\n=== User question ===\n${message}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      reply =
        completion.choices[0]?.message?.content?.trim() ??
        'Sorry, I could not generate a response.';
    } catch (err) {
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : 'Unknown OpenAI error';
      logger.error('OpenAI chat completion failed', { message: msg });
      throw AppError.serviceUnavailable('Chat service temporarily unavailable');
    }

    // ── 5. Build sources list from the retrieved books ────────────────────
    const sources: ChatSource[] = similarBooks.map((b) => {
      const book = b as {
        _id: Types.ObjectId | string;
        title: string;
        author: string;
        genre: string;
      };
      return {
        id: String(book._id),
        title: book.title,
        author: book.author,
        genre: book.genre,
      };
    });

    return { reply, sources };
  }
}

export const chatService = new ChatService();
