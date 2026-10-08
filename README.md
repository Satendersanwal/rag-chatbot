# RAG Chatbot Monorepo

A full-stack Retrieval-Augmented Generation (RAG) chatbot example with OpenAI integration. Built as an npm workspaces monorepo with TypeScript/Express backend, React/Vite frontend, PostgreSQL with pgvector, and a shared UI component library.

## 🚀 New? Start Here!

**Want to run this locally in 5 minutes?** → **[QUICKSTART.md](./QUICKSTART.md)**

The quickstart guide walks you through getting everything running with Docker Compose in just a few commands!

---

## Table of Contents

- [Deploy to Render](#-deploy-to-render)
- [Features](#-features)
- [Repository Structure](#-repository-structure)
- [Quick Start with Docker](#-quick-start-with-docker)
- [Docker Commands](#-docker-commands)
- [Troubleshooting](#-troubleshooting)
- [Additional Documentation](#-additional-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Deploy to Render

This project is pre-configured for one-click deployment to [Render](https://render.com/) using the included `render.yaml` blueprint.

**What you get:**
- ✅ Automatic database migrations on deployment
- ✅ Automatic database seeding with 15 AI/ML docs
- ✅ PostgreSQL with pgvector extension
- ✅ Auto-scaling and health checks
- ✅ Separate backend and frontend services
- ✅ Environment variable management

**Deployment steps:**

1. **Fork this repository to your GitHub account**

2. **Create a new Blueprint Instance on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint Instance"
   - Connect your forked repository
   - Select branch (usually `main`)

3. **Configure environment variables:**
   - Render will auto-detect `render.yaml`
   - You'll be prompted to enter your `OPENAI_API_KEY` ([Get one here](https://platform.openai.com/api-keys))
   - All other variables are pre-configured (including `RUN_SEED=true`)

4. **Deploy:**
   - Click "Apply" to create all services
   - Render will:
     - Create PostgreSQL database with pgvector
     - Build and deploy backend with automatic migrations
     - Automatically seed database with 15 AI/ML documentation files
     - Build and deploy frontend
     - Link services together

5. **Access your deployed app:**
   - Frontend: `https://your-app-name-frontend.onrender.com`
   - Backend API: `https://your-app-name-backend.onrender.com`

**Note:** Database seeding is enabled by default (`RUN_SEED=true` in render.yaml). Docs that are already in the database are skipped, so you only pay a small one-time OpenAI API cost (~$0.01-0.02) for generating embeddings. To disable automatic seeding, change `RUN_SEED` to `false` in the Render dashboard after deployment.

**Document ingestion:** `POST /api/chat/ingest` is protected by `ADMIN_API_KEY`, which Render generates for you. Copy it from the backend service's Environment tab and send it as `Authorization: Bearer <key>`.

**Cost Estimate:**
- 2 Web Services (frontend + backend): `render.yaml` uses the paid `starter` instance type. To run for free, change `plan: starter` to `plan: free` for both services (free services sleep when idle and take a while to wake up).
- 1 PostgreSQL Database: Free plan (with limitations; see Render's docs)
- OpenAI API (one-time seeding): ~$0.01-0.02, plus a small cost per chat message

## ✨ Features

- 🤖 **RAG-Powered Responses** - Semantic search over document knowledge base using vector embeddings
- 💬 **Conversation History** - Persistent multi-turn conversations with context awareness
- 📚 **Source Citations** - Shows which documents informed each response, with match scores
- 🎯 **Real-time Token Usage** - Visual context window usage tracking
- 🚀 **Easy Deployment** - One-click Render.com deployment with automated migrations

## 📁 Repository Structure

```
.
├── backend/            # Express + TypeScript API (RAG + chat endpoints)
│   ├── src/
│   │   ├── services/   # RAG, embedding, LLM, and vector services
│   │   ├── routes/     # API endpoints (chat, health)
│   │   ├── db/         # Database config, migrations, and utilities
│   │   └── ...
│   ├── Dockerfile      # Production container with auto-migrations
│   └── start.sh        # Startup script (runs migrations then starts server)
├── frontend/           # React + Vite app (chat UI)
│   ├── src/
│   │   ├── components/ # Chatbot component with real API integration
│   │   └── config.ts   # API configuration
│   ├── Dockerfile      # Nginx-served production build
│   └── nginx.conf      # Nginx configuration
├── common-ui/          # Shared UI components and styles
├── docker-compose.yml  # Full-stack local development (Postgres + backend + frontend)
├── render.yaml         # Production deployment configuration (Render.com)
├── package.json        # Root workspaces + scripts
└── README.md
```

## 🚀 Quick Start with Docker

**For detailed step-by-step instructions, see [QUICKSTART.md](./QUICKSTART.md)**

**TL;DR:**

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd rag-chatbot

# 2. Create .env.docker file with your OpenAI API key
cat > .env.docker << 'EOF'
OPENAI_API_KEY=sk-your-actual-key-here
DB_PASSWORD=postgres
EOF

# 3. Start everything
docker compose up -d

# 4. Open http://localhost:3000
```

This starts:
- ✅ PostgreSQL with pgvector (port 5432)
- ✅ Backend API with auto-migrations (port 3001)
- ✅ Frontend UI (port 3000)
- ✅ Automatic database seeding with 15 AI/ML docs

## 📦 Docker Commands

**Start all services:**
```bash
docker compose up -d
```

**Stop all services:**
```bash
docker compose down
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

**Rebuild after code changes:**
```bash
docker compose up -d --build
```

## 🐛 Troubleshooting

**1. Docker port conflicts:**
```bash
# Check what's using the port
lsof -i :5432  # or :3001, :3000

# Change ports in docker-compose.yml or .env files
```

**2. Database connection errors:**
```bash
# Ensure PostgreSQL is running
docker compose ps

# Check database logs
docker compose logs postgres
```

**3. OpenAI API errors:**
- Verify your API key is valid at https://platform.openai.com/api-keys
- Check your OpenAI account has credits
- Ensure API key is properly set in `.env.docker` or environment variables

**4. Frontend can't reach backend:**
- For local dev: Frontend should connect to `http://localhost:3001`
- For Docker: Check `VITE_API_URL` in `docker-compose.yml` build args
- For Render: Services are auto-linked via `render.yaml`

**Getting more help:**
1. Check service logs: `docker compose logs <service-name>`
2. Verify all environment variables are set correctly
3. Ensure Docker containers are healthy: `docker compose ps`
4. See detailed troubleshooting in `backend/README.md`

## 📚 Additional Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 🚀 Get started in 5 minutes with Docker Compose
- `backend/README.md` - Detailed backend documentation and API reference
- `backend/SETUP.md` - PostgreSQL and pgvector setup guide
- `backend/DOCKER.md` - Docker development and deployment details
- `frontend/README.md` - Frontend component documentation
- `common-ui/README.md` - Shared UI component library docs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT — see [LICENSE](./LICENSE).

## Maintainer

Maintained by **Satender Sanwal**.

- GitHub: [@Satendersanwal](https://github.com/Satendersanwal)
- Email: [satendersanwal15@gmail.com](mailto:satendersanwal15@gmail.com)
