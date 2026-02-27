import OpenAI from 'openai';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * Lazily-initialised OpenAI client.
 *
 * Lazy init (same pattern as firebase.ts) lets the server start in
 * environments where OPENAI_API_KEY is not yet set (e.g. CI, local dev
 * without an AI key) without crashing at module-load time.
 * The client is only constructed on the first call to generateEmbedding().
 */
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Throw 503 — this is an infrastructure configuration error,
      // not a programmer error, so it should surface as an HTTP error.
      throw AppError.serviceUnavailable('OpenAI API key is not configured');
    }

    _client = new OpenAI({ apiKey });
  }

  return _client;
}

/**
 * Generate a text embedding using OpenAI text-embedding-3-small.
 *
 * @param text  - The input string to embed (title + author + description).
 * @returns     - A 1536-dimensional float vector.
 *
 * Error handling:
 *   - Missing API key     → 503 (configuration issue)
 *   - OpenAI API failure  → 503 (transient upstream error)
 *   - Raw OpenAI errors are NEVER forwarded to the client.
 *   - The API key is NEVER logged.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (err) {
    // Re-throw our own operational errors (e.g. missing key) unchanged
    if (err instanceof AppError) throw err;

    // Log the error class/message for debugging — never log the key or embedding
    const message = err instanceof Error ? err.message : 'Unknown OpenAI error';
    logger.error('OpenAI embedding request failed', { message });

    throw AppError.serviceUnavailable('Embedding service unavailable');
  }
}

/**
 * Build the combined text string that is embedded for a book.
 * Keeping this centralised ensures create and update use identical input,
 * so embeddings are always comparable.
 *
 * @param title       - Book title
 * @param author      - Book author
 * @param description - Book description (may be empty string)
 */
export function buildEmbeddingInput(title: string, author: string, description: string): string {
  return `${title} ${author} ${description}`.trim();
}
