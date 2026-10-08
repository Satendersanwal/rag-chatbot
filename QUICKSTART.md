# 🚀 Quickstart Guide

Get the RAG Chatbot running locally in under 5 minutes using Docker Compose!

## Prerequisites

- **Docker Desktop** installed ([Download here](https://www.docker.com/products/docker-desktop))
- **OpenAI API key** ([Get one here](https://platform.openai.com/api-keys))

That's it! Docker handles everything else (PostgreSQL, pgvector, Node.js, etc.)

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rag-chatbot
```

### 2. Create Environment File

Create a file named `.env.docker` in the root directory:

```bash
# Copy this template and fill in your OpenAI API key
cat > .env.docker << 'EOF'
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Optional: Database password (change for production)
DB_PASSWORD=postgres

# Optional: Choose your models
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional: Secret key that enables POST /api/chat/ingest (leave out to keep it disabled)
ADMIN_API_KEY=change-me-to-a-long-random-string
EOF
```

**Important:** Replace `sk-your-actual-openai-key-here` with your real OpenAI API key!

### 3. Start Everything

```bash
docker compose up -d
```

This single command will:
- ✅ Download and start PostgreSQL with pgvector
- ✅ Build and start the backend API
- ✅ Run database migrations automatically
- ✅ Seed database with 15 AI/ML documentation files
- ✅ Build and start the frontend UI

**First-time setup takes 2-3 minutes** to build Docker images. Subsequent starts are instant!

### 4. Open the App

Once the containers are running, open your browser to:

**http://localhost:3000**

You should see the chatbot interface. Try asking:
- "What is machine learning?"
- "Explain how transformers work"
- "What is RAG?"

The chatbot will search through the 15 seeded documents to answer your questions!

## 🎉 You're Done!

That's it! You now have a fully functional RAG chatbot with:
- Vector database (PostgreSQL + pgvector)
- Backend API with RAG pipeline
- Beautiful chat interface
- 15 pre-loaded AI/ML documentation files

## Useful Commands

### View logs
```bash
# All services
docker compose logs -f

# Just backend
docker compose logs -f backend

# Just frontend
docker compose logs -f frontend
```

### Stop everything
```bash
docker compose down
```

### Restart everything
```bash
docker compose restart
```

### Rebuild after code changes
```bash
docker compose up -d --build
```

## What's Running?

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | http://localhost:3000 | Chat UI |
| Backend API | http://localhost:3001 | RAG endpoints |
| PostgreSQL | localhost:5432 | Vector database |

## Verify It's Working

### 1. Check all services are running:
```bash
docker compose ps
```

You should see all three services with status "Up".

### 2. Check backend health:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "success": true,
  "message": "RAG Chatbot API is running",
  "timestamp": "...",
  "uptime": ...
}
```

### 3. Check database stats:
```bash
curl http://localhost:3001/api/chat/stats
```

Should return:
```json
{
  "success": true,
  "data": {
    "totalDocuments": 15,
    "embeddingDimension": 1536
  }
}
```

## Troubleshooting

### Port already in use?

If you see errors about ports 3000, 3001, or 5432 already being used:

```bash
# Find what's using the ports
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Stop those services or edit docker-compose.yml to use different ports
```

### OpenAI API errors?

1. Verify your API key is correct in `.env.docker`
2. Check your OpenAI account has credits at https://platform.openai.com/account/billing
3. Make sure you didn't include quotes around the API key

### Database not seeding?

The database seeds automatically on first startup. On later startups, docs that are already in the database are skipped (you'll see "All N document(s) are already seeded"). If you see "⏭️ Skipping database seeding", it means `RUN_SEED` is disabled.

To enable it, edit `docker-compose.yml` and change:
```yaml
RUN_SEED: ${RUN_SEED:-false}
# to
RUN_SEED: ${RUN_SEED:-true}
```

Then rebuild:
```bash
docker compose up -d --build backend
```

### Fresh start?

To completely reset everything and start from scratch:

```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up -d --build
```

## Cost Considerations

### OpenAI API Usage

- **Database seeding**: ~$0.01-0.02 (one-time, generates embeddings for 15 documents)
- **Per chat message**: ~$0.001-0.01 (depending on model and conversation length)

**Tip:** The default `gpt-4.1-mini` is already a low-cost model. Chat requests are rate limited to 20 per minute per IP by default (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`).

### Free Alternatives for Learning

If you want to learn without spending money on OpenAI:
1. Set `RUN_SEED=false` in docker-compose.yml to skip automatic seeding
2. Don't run the seed command manually
3. Add your own documents via the API (costs nothing until you generate embeddings)

## What's Next?

### Add Your Own Documents

Use the API to ingest custom documents. This requires `ADMIN_API_KEY` to be set in `.env.docker` (see step 2):

```bash
curl -X POST http://localhost:3001/api/chat/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-to-a-long-random-string" \
  -d '{
    "documents": [
      {
        "content": "Your custom knowledge here...",
        "metadata": {
          "category": "Custom",
          "topic": "Your Topic"
        }
      }
    ]
  }'
```

### Customize the Knowledge Base

Add more markdown files to `backend/src/db/docs/` and rebuild:

```bash
docker compose up -d --build backend
```

### Deploy to Production

See the main [README.md](./README.md) for deployment options:
- **Render.com**: One-click deployment (recommended)
- **Any Docker host**: Use the included Dockerfiles
- **Kubernetes**: Adapt the docker-compose.yml to K8s manifests

## Need Help?

- **API Documentation**: See `backend/README.md`
- **Frontend Details**: See `frontend/README.md`
- **Docker Specifics**: See `backend/DOCKER.md`
- **PostgreSQL Setup**: See `backend/SETUP.md`

## Common Questions

**Q: Can I use a different database?**
A: This project requires PostgreSQL with the pgvector extension for vector similarity search.

**Q: Can I use a different LLM provider?**
A: Currently only OpenAI is supported. Adding support for Anthropic, Cohere, or local models would require code changes.

**Q: How do I change the chat model?**
A: Edit `.env.docker`, change `OPENAI_CHAT_MODEL` to any current OpenAI chat model (e.g. gpt-4.1-mini, gpt-4.1), then run `docker compose up -d` to recreate the backend.

**Q: Is my API key secure?**
A: The API key is only stored in your local `.env.docker` file and used by the backend container. Never commit this file to Git!

**Q: How do I update the code?**
A: Pull the latest changes and rebuild:
```bash
git pull
docker compose up -d --build
```

---

**That's it!** You now have a production-ready RAG chatbot running locally. Start chatting and exploring! 🎉

