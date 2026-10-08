import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import chatRouter from './routes/chat';
import healthRouter from './routes/health';
import { testConnection, closePool } from './db/config';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Behind a reverse proxy (e.g. Render), trust its X-Forwarded-For header so
// req.ip (used for rate limiting) is the real client IP, not the proxy's
if (process.env.TRUST_PROXY) {
  const hops = parseInt(process.env.TRUST_PROXY, 10);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server with database connection test
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('⚠️  Server starting without database connection');
      console.error('   Please check your database configuration in .env');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');

      server.close(() => {
        console.log('✅ HTTP server closed');
      });

      await closePool();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;