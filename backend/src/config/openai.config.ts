import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE reading them
// This ensures scripts that import this config get the env vars loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
  console.warn('   AI features will not work until you add your API key to .env');
}

// OpenAI configuration
export const openAIConfig = {
  // Embedding model configuration
  embedding: {
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10),
  },

  // Chat completion model configuration
  chat: {
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  },

  // Rate limiting and retry configuration
  retry: {
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.OPENAI_RETRY_DELAY || '1000', 10),
  },
};

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-key',
  maxRetries: openAIConfig.retry.maxRetries,
});

// Check if OpenAI is properly configured
export const isOpenAIConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder-key';
};
