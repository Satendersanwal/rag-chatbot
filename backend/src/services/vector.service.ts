import { documentRepository } from '../repositories/document.repository';
import { DocumentInput, VectorSearchResult } from '../models/document.model';

export class VectorService {
  /**
   * Add a document to the vector database
   * Note: You need to generate embeddings before calling this method
   */
  async addDocument(
    content: string,
    embedding: number[],
    metadata?: Record<string, unknown>
  ) {
    const input: DocumentInput = {
      content,
      embedding,
      metadata
    };

    return await documentRepository.create(input);
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(
    documents: Array<{
      content: string;
      embedding: number[];
      metadata?: Record<string, unknown>;
    }>
  ) {
    const results = [];

    for (const doc of documents) {
      const result = await this.addDocument(
        doc.content,
        doc.embedding,
        doc.metadata
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Search for similar documents using vector similarity
   * @param queryEmbedding - The embedding vector of the query
   * @param limit - Maximum number of results to return
   * @param threshold - Minimum similarity score (0-1)
   */
  async search(
    queryEmbedding: number[],
    limit = 5,
    threshold = 0.7
  ): Promise<VectorSearchResult[]> {
    console.log(`🔍 Vector search params: limit=${limit}, threshold=${threshold}, embeddingSize=${queryEmbedding.length}`);
    const results = await documentRepository.vectorSearch(
      queryEmbedding,
      limit,
      threshold
    );
    console.log(`📊 Vector search returned ${results.length} results`);
    if (results.length > 0) {
      console.log(`   Top result similarity: ${results[0].similarity.toFixed(4)}`);
    }
    return results;
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string) {
    return await documentRepository.findById(id);
  }

  /**
   * Get all documents (paginated)
   */
  async getAllDocuments(limit = 100, offset = 0) {
    return await documentRepository.findAll(limit, offset);
  }

  /**
   * Update document embedding
   * Useful when you need to re-embed existing documents
   */
  async updateEmbedding(id: string, embedding: number[]) {
    return await documentRepository.updateEmbedding(id, embedding);
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string) {
    return await documentRepository.delete(id);
  }

  /**
   * Get statistics about the vector database
   */
  async getStats() {
    const totalDocuments = await documentRepository.count();

    return {
      totalDocuments,
      embeddingDimension: 1536 // This should match your model's dimension
    };
  }

  /**
   * Build context string from search results for RAG
   */
  buildContext(results: VectorSearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    const contextParts = results.map((result, index) => {
      return `[Document ${index + 1}] (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n${result.content}`;
    });

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Format sources for inclusion in chat response
   */
  formatSources(results: VectorSearchResult[]) {
    return results.map(result => ({
      id: result.id,
      content: result.content,
      metadata: result.metadata,
      similarity: result.similarity
    }));
  }
}

export const vectorService = new VectorService();