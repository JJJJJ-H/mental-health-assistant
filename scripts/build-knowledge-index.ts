import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  KnowledgeDocument,
  KnowledgeIndex
} from "../server/rag/types.js";

const DEFAULT_MAX_LENGTH = 700;
const DEFAULT_OVERLAP = 100;

export function parseKnowledgeDocument(source: string): KnowledgeDocument {
  const match = source.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Knowledge document must begin with YAML front matter");
  }

  const frontMatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    frontMatter[key] = value;
  }

  for (const field of ["id", "title", "source"] as const) {
    if (!frontMatter[field]) {
      throw new Error(`Knowledge document is missing required front matter: ${field}`);
    }
  }

  const content = match[2].trim();
  if (!content) {
    throw new Error("Knowledge document body must not be empty");
  }

  return {
    id: frontMatter.id,
    title: frontMatter.title,
    source: frontMatter.source,
    content
  };
}

export function chunkText(
  text: string,
  maxLength = DEFAULT_MAX_LENGTH,
  overlap = DEFAULT_OVERLAP
): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }
  if (maxLength <= 0 || overlap < 0 || overlap >= maxLength) {
    throw new Error("chunkText requires maxLength > overlap >= 0");
  }

  const chunks: string[] = [];
  const step = maxLength - overlap;
  for (let start = 0; start < normalized.length; start += step) {
    chunks.push(normalized.slice(start, start + maxLength).trim());
    if (start + maxLength >= normalized.length) {
      break;
    }
  }
  return chunks.filter(Boolean);
}

export function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokens = normalized.match(/[a-z0-9]+|[\u3400-\u9fff]+/g) ?? [];
  const result: string[] = [];

  for (const token of tokens) {
    if (/^[a-z0-9]+$/.test(token)) {
      result.push(token);
      continue;
    }
    const characters = [...token];
    result.push(...characters);
    for (let index = 0; index < characters.length - 1; index += 1) {
      result.push(characters[index] + characters[index + 1]);
    }
  }

  return result;
}

export function buildIndex(documents: KnowledgeDocument[]): KnowledgeIndex {
  const sortedDocuments = [...documents].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  const baseChunks = sortedDocuments.flatMap((document) =>
    chunkText(document.content).map((content, index) => ({
      id: `${document.id}-${index + 1}`,
      documentId: document.id,
      title: document.title,
      source: document.source,
      content
    }))
  );

  const tokenSets = baseChunks.map((chunk) => new Set(tokenize(chunk.content)));
  const documentFrequency = new Map<string, number>();
  for (const tokens of tokenSets) {
    for (const token of tokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const idf = Object.fromEntries(
    [...documentFrequency.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([token, frequency]) => [
        token,
        Math.log((baseChunks.length + 1) / (frequency + 1)) + 1
      ])
  );

  const chunks = baseChunks.map((chunk) => {
    const counts = new Map<string, number>();
    const tokens = tokenize(chunk.content);
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    const vector = Object.fromEntries(
      [...counts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([token, count]) => [token, (count / tokens.length) * idf[token]])
    );
    return { ...chunk, vector };
  });

  return { documents: sortedDocuments, chunks, idf };
}

function generateIndexModule(index: KnowledgeIndex): string {
  return `import type { KnowledgeIndex } from "./types.js";

export const knowledgeIndex: KnowledgeIndex = ${JSON.stringify(index, null, 2)};
`;
}

function runCli(): void {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(scriptDirectory, "..");
  const knowledgeDirectory = join(projectRoot, "knowledge");
  const documents = readdirSync(knowledgeDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) =>
      parseKnowledgeDocument(readFileSync(join(knowledgeDirectory, fileName), "utf8"))
    );
  const outputPath = join(projectRoot, "server", "rag", "index.generated.ts");
  writeFileSync(outputPath, generateIndexModule(buildIndex(documents)), "utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
