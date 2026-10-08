import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { requireAdminKey } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { ragService } from '../services/rag.service';
import { vectorService } from '../services/vector.service';

const router = Router();

const MAX_MESSAGE_LENGTH = 4000;
const MAX_SOURCES_LIMIT = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Each chat message costs OpenAI credits, so cap requests per client IP
const chatRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '20', 10)
});

interface ChatRequest {
  message: string;
  conversationId?: string;
  maxSources?: number;
  similarityThreshold?: number;
  includeHistory?: boolean;
}

// POST /api/chat - Send a message to the chatbot
router.post('/', chatRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      message,
      conversationId,
      maxSources,
      similarityThreshold,
      includeHistory
    }: ChatRequest = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new ApiError(400, 'Message is required and must be a non-empty string');
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new ApiError(400, `Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    }

    if (conversationId != null && (typeof conversationId !== 'string' || !UUID_PATTERN.test(conversationId))) {
      throw new ApiError(400, 'conversationId must be a valid UUID');
    }

    if (maxSources != null && (!Number.isInteger(maxSources) || maxSources < 1 || maxSources > MAX_SOURCES_LIMIT)) {
      throw new ApiError(400, `maxSources must be an integer between 1 and ${MAX_SOURCES_LIMIT}`);
    }

    if (similarityThreshold != null && (typeof similarityThreshold !== 'number' || similarityThreshold < 0 || similarityThreshold > 1)) {
      throw new ApiError(400, 'similarityThreshold must be a number between 0 and 1');
    }

    // Use RAG service to process the query
    const result = await ragService.query(message, conversationId, {
      maxSources,
      similarityThreshold,
      includeHistory
    });

    res.json({
      success: true,
      data: {
        message: result.answer,
        conversationId: result.conversationId,
        timestamp: new Date().toISOString(),
        sources: result.sources,
        sourceCount: result.sources.length,
        usage: result.usage
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/history/:conversationId - Get conversation history
router.get('/history/:conversationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;

    if (!UUID_PATTERN.test(conversationId)) {
      throw new ApiError(400, 'conversationId must be a valid UUID');
    }

    const history = await ragService.getHistory(conversationId);

    if (!history) {
      throw new ApiError(404, 'Conversation not found');
    }

    res.json({
      success: true,
      data: {
        conversationId: history.conversation.id,
        messages: history.messages,
        createdAt: history.conversation.created_at,
        updatedAt: history.conversation.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/ingest - Ingest documents into the vector database (requires ADMIN_API_KEY)
router.post('/ingest', requireAdminKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      throw new ApiError(400, 'Documents array is required and must not be empty');
    }

    if (documents.some(doc => !doc || typeof doc.content !== 'string' || !doc.content.trim())) {
      throw new ApiError(400, 'Each document must have a non-empty "content" string');
    }

    const results = await ragService.ingestDocuments(documents);

    res.json({
      success: true,
      data: {
        ingested: results.length,
        results
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/stats - Get vector database statistics
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await vectorService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;