import { tokenize } from "../../scripts/build-knowledge-index.js";
import { knowledgeIndex } from "./index.generated.js";
import type { RetrievedSource } from "../types.js";

const MIN_SCORE = 0.02;

function vectorizeQuery(query: string): Record<string, number> {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return {};
  }

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].map(([token, count]) => [
      token,
      (count / tokens.length) * (knowledgeIndex.idf[token] ?? 0)
    ])
  );
}

function cosineSimilarity(
  left: Record<string, number>,
  right: Record<string, number>
): number {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of Object.values(left)) {
    leftMagnitude += value * value;
  }
  for (const [token, value] of Object.entries(right)) {
    dotProduct += (left[token] ?? 0) * value;
    rightMagnitude += value * value;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function retrieveSources(query: string, topK = 4): RetrievedSource[] {
  if (!query.trim()) {
    return [];
  }

  const queryVector = vectorizeQuery(query);
  const seenDocuments = new Set<string>();
  const results: RetrievedSource[] = [];

  const scoredChunks = knowledgeIndex.chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryVector, chunk.vector) }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((left, right) => right.score - left.score);

  for (const { chunk, score } of scoredChunks) {
    if (seenDocuments.has(chunk.documentId)) {
      continue;
    }

    seenDocuments.add(chunk.documentId);
    results.push({
      id: chunk.id,
      documentId: chunk.documentId,
      index: results.length + 1,
      title: chunk.title,
      source: chunk.source,
      excerpt: chunk.content.slice(0, 240),
      score: Math.round(score * 1000) / 1000
    });

    if (results.length >= topK) {
      break;
    }
  }

  return results;
}
