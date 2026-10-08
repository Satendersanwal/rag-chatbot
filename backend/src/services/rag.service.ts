import { vectorService } from './vector.service';
import { conversationRepository } from '../repositories/conversation.repository';
import { VectorSearchResult } from '../models/document.model';
import { embeddingService } from './embedding.service';
import { llmService, ChatMessage, TokenUsage } from './llm.service';
import { isOpenAIConfigured } from '../config/openai.config';
import { ApiError } from '../middleware/errorHandler';

export interface RAGResponse {
  answer: string;
  sources: VectorSearchResult[];
  conversationId: string;
  usage: TokenUsage;
}

export class RAGService {
  /**
   * Process a user query using RAG pipeline
   *
   * Steps:
   * 1. Create or load the conversation and save the user message
   * 2. Generate embedding for the query
   * 3. Search for relevant documents using vector similarity
   * 4. Load recent conversation history
   * 5. Generate response using the LLM with retrieved context
   * 6. Save the assistant response
   */
  async query(
    userMessage: string,
    conversationId?: string,
    options?: {
      maxSources?: number;
      similarityThreshold?: number;
      includeHistory?: boolean;
    }
  ): Promise<RAGResponse> {
    const maxSources = options?.maxSources ?? parseInt(process.env.MAX_SOURCES || '5', 10);
    const similarityThreshold = options?.similarityThreshold ?? parseFloat(process.env.SIMILARITY_THRESHOLD || '0.2');
    const includeHistory = options?.includeHistory ?? true;

    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI is not configured. Please add OPENAI_API_KEY to your .env file.');
    }

    // Step 1: Create or get conversation
    let convId = conversationId;
    if (convId) {
      const existing = await conversationRepository.findConversationById(convId);
      if (!existing) {
        throw new ApiError(404, 'Conversation not found');
      }
    } else {
      const conversation = await conversationRepository.createConversation();
      convId = conversation.id;
    }

    // Save user message
    await conversationRepository.addMessage({
      conversation_id: convId,
      role: 'user',
      content: userMessage
    });

    // Step 2: Generate query embedding
    console.log('🔍 Generating embedding for query...');
    const queryEmbedding = await embeddingService.generateEmbedding(userMessage);

    // Step 3: Search for relevant documents using vector similarity
    console.log('📚 Searching for relevant documents...');
    const sources = await vectorService.search(
      queryEmbedding,
      maxSources,
      similarityThreshold
    );

    console.log(`✅ Found ${sources.length} relevant document(s)`);

    // Step 4: Get conversation history if needed
    let conversationHistory: ChatMessage[] = [];
    if (includeHistory) {
      const history = await conversationRepository.getMessages(convId);
      // Convert to chat messages (exclude the current user message we just added)
      conversationHistory = history
        .slice(0, -1) // Remove last message (current user message)
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
    }

    // Step 5: Generate response using LLM with retrieved context
    console.log('💭 Generating AI response...');
    const result = await llmService.generateChatCompletion(
      userMessage,
      sources,
      conversationHistory.length > 0 ? conversationHistory : undefined
    );

    // Step 6: Save assistant response
    await conversationRepository.addMessage({
      conversation_id: convId,
      role: 'assistant',
      content: result.content,
      sources: vectorService.formatSources(sources)
    });

    console.log('✅ Response generated successfully');

    return {
      answer: result.content,
      sources,
      conversationId: convId,
      usage: result.usage
    };
  }

  /**
   * Get conversation history
   */
  async getHistory(conversationId: string) {
    return await conversationRepository.getConversationWithMessages(conversationId);
  }

  /**
   * Ingest documents into the vector database
   * @param documents - Array of documents to ingest
   */
  async ingestDocuments(
    documents: Array<{
      content: string;
      metadata?: Record<string, unknown>;
    }>
  ) {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI is not configured. Please add OPENAI_API_KEY to your .env file.');
    }

    const results = [];

    console.log(`📝 Starting ingestion of ${documents.length} document(s)...`);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        // Check if document needs chunking
        const chunks = embeddingService.chunkText(doc.content);

        if (chunks.length > 1) {
          console.log(`📄 Document ${i + 1} split into ${chunks.length} chunks`);

          // Process each chunk
          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            const embedding = await embeddingService.generateEmbedding(chunk);

            const chunkMetadata = {
              ...doc.metadata,
              chunkIndex: j,
              totalChunks: chunks.length,
              isChunked: true
            };

            const result = await vectorService.addDocument(chunk, embedding, chunkMetadata);
            results.push({
              status: 'success',
              documentIndex: i,
              chunkIndex: j,
              id: result.id
            });
          }
        } else {
          // Process single document
          console.log(`📄 Processing document ${i + 1}/${documents.length}...`);
          const embedding = await embeddingService.generateEmbedding(doc.content);
          const result = await vectorService.addDocument(doc.content, embedding, doc.metadata);

          results.push({
            status: 'success',
            documentIndex: i,
            id: result.id
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing document ${i + 1}:`, error.message);
        results.push({
          status: 'error',
          documentIndex: i,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`✅ Ingestion complete: ${successCount}/${results.length} successful`);

    return results;
  }

  /**
   * Ingest a single document with automatic chunking
   */
  async ingestDocument(
    content: string,
    metadata?: Record<string, unknown>
  ) {
    return this.ingestDocuments([{ content, metadata }]);
  }
}

export const ragService = new RAGService();