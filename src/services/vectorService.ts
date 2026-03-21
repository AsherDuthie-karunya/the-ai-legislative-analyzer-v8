/**
 * Simple in-memory Vector Store for demonstration.
 * In production, use Pinecone, Chroma, or pgvector.
 */

import { getEmbeddings } from "./aiService";

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: any;
}

export class VectorStore {
  private store: VectorEntry[] = [];

  async add(id: string, text: string, metadata: any) {
    try {
      const vector = await getEmbeddings(text);
      this.store.push({ id, vector, metadata });
      return true;
    } catch (error) {
      console.error("VectorStore Add Error:", error);
      return false;
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(query: string, topK: number = 3) {
    if (this.store.length === 0) return [];
    
    try {
      const queryVector = await getEmbeddings(query);
      const results = this.store
        .map((entry) => ({
          ...entry,
          score: this.cosineSimilarity(queryVector, entry.vector),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return results;
    } catch (error) {
      console.error("VectorStore Search Error:", error);
      return [];
    }
  }

  clear() {
    this.store = [];
  }
}

export const globalVectorStore = new VectorStore();
