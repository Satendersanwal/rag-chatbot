import { openai, openAIConfig, isOpenAIConfigured } from '../config/openai.config';
import { VectorSearchResult } from '../models/document.model';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: TokenUsage;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class LLMService {
  /**
   * Generate a chat completion with optional RAG context
   */
  async generateChatCompletion(
    userMessage: string,
    context?: VectorSearchResult[],
    conversationHistory?: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const messages: ChatMessage[] = [];

    // Add system prompt
    const systemPrompt = options?.systemPrompt || this.buildSystemPrompt(context);
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await openai.chat.completions.create({
        model: openAIConfig.chat.model,
        messages: messages,
        temperature: options?.temperature ?? openAIConfig.chat.temperature,
        // max_tokens is deprecated and rejected by newer models; max_completion_tokens works on all of them
        max_completion_tokens: options?.maxTokens ?? openAIConfig.chat.maxTokens,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response generated from OpenAI');
      }

      const content = response.choices[0].message.content || '';
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return { content, usage };
    } catch (error: any) {
      console.error('Error generating chat completion:', error);

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error. Please try again later.');
      }

      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(context?: VectorSearchResult[]): string {
    let systemPrompt = `You are a helpful AI customer service assistant. You provide accurate, relevant, and concise answers based on the information available to you.`;

    if (context && context.length > 0) {
      systemPrompt += `\n\nUse the following context to answer the user's question. If the context doesn't contain relevant information, please alert the user clearly that it is from your general knowledge.\n\n`;
      systemPrompt += `CONTEXT:\n`;
      systemPrompt += `---\n`;

      context.forEach((doc, index) => {
        systemPrompt += `[Source ${index + 1}] (Relevance: ${(doc.similarity * 100).toFixed(1)}%)\n`;
        systemPrompt += `${doc.content}\n\n`;
        if (index < context.length - 1) {
          systemPrompt += `---\n`;
        }
      });

      systemPrompt += `\nWhen using information from the context, try to reference which source it came from (e.g., "According to Source 1...").`;
    }

    return systemPrompt;
  }

  /**
   * Generate a streaming chat completion
   * Note: This is a placeholder for streaming support
   */
  async *generateChatCompletionStream(
    userMessage: string,
    context?: VectorSearchResult[],
    conversationHistory?: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const messages: ChatMessage[] = [];

    // Add system prompt
    const systemPrompt = options?.systemPrompt || this.buildSystemPrompt(context);
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const stream = await openai.chat.completions.create({
        model: openAIConfig.chat.model,
        messages: messages,
        temperature: options?.temperature ?? openAIConfig.chat.temperature,
        max_completion_tokens: options?.maxTokens ?? openAIConfig.chat.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      console.error('Error generating streaming chat completion:', error);
      throw new Error(`Failed to generate streaming response: ${error.message}`);
    }
  }

  /**
   * Summarize a long text
   */
  async summarize(text: string, maxLength = 200): Promise<string> {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    try {
      const response = await openai.chat.completions.create({
        model: openAIConfig.chat.model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that summarizes text concisely.`,
          },
          {
            role: 'user',
            content: `Summarize the following text in ${maxLength} words or less:\n\n${text}`,
          },
        ],
        temperature: 0.5,
        max_completion_tokens: Math.ceil(maxLength * 1.5), // Allow some overhead
      });

      return response.choices[0].message.content || '';
    } catch (error: any) {
      console.error('Error summarizing text:', error);
      throw new Error(`Failed to summarize text: ${error.message}`);
    }
  }
}

export const llmService = new LLMService();