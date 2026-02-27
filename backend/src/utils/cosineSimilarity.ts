/**
 * Compute cosine similarity between two equal-length vectors.
 *
 * Returns a value in [-1, 1] where 1 = identical direction.
 * For OpenAI embeddings this is always in [0, 1] in practice.
 *
 * Throws if the vectors are different lengths to surface embedding
 * mismatches (e.g. model change) loudly rather than silently returning
 * a wrong result.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimension mismatch');
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
