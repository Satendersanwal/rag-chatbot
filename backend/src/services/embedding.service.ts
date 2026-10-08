import { openai, openAIConfig, isOpenAIConfigured } from '../config/openai.config';

export class EmbeddingService {
  /**
   * Generate embedding vector for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    try {
      const response = await openai.embeddings.create({
        model: openAIConfig.embedding.model,
        input: text,
        encoding_format: 'float',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding returned from OpenAI');
      }

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('Error generating embedding:', error);

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error. Please try again later.');
      }

      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      const response = await openai.embeddings.create({
        model: openAIConfig.embedding.model,
        input: texts,
        encoding_format: 'float',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned from OpenAI');
      }

      // Sort by index to ensure correct order
      return response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);
    } catch (error: any) {
      console.error('Error generating embeddings:', error);

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error. Please try again later.');
      }

      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Get the dimension of embeddings produced by the current model
   */
  getEmbeddingDimension(): number {
    return openAIConfig.embedding.dimensions;
  }

  /**
   * Chunk text into smaller pieces for embedding
   * Useful for long documents that exceed token limits
   */
  chunkText(text: string, maxChunkSize = 8000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If a single paragraph is too long, split by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxChunkSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const embeddingService = new EmbeddingService();