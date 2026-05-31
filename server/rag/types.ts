export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  content: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  title: string;
  source: string;
  content: string;
  vector: Record<string, number>;
}

export interface KnowledgeIndex {
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  idf: Record<string, number>;
}
