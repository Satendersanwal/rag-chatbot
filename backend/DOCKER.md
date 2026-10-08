# Docker Setup Guide

This guide explains how to run the RAG Chatbot backend using Docker Compose.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Quick Start

1. **Create environment file**

   Copy the Docker environment template:
   ```bash
   cp .env.docker .env
   ```

2. **Configure environment variables**

   Edit the `.env` file and set your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```

   You can also customize other settings like:
   - `DB_PASSWORD`: PostgreSQL password (default: postgres)
   - `OPENAI_CHAT_MODEL`: Chat model to use (default: gpt-4.1-mini)
   - `ADMIN_API_KEY`: Secret that enables `POST /api/chat/ingest` (disabled when unset)
   - `OPENAI_EMBEDDING_MODEL`: Embedding model (default: text-embedding-3-small)
   - `CORS_ORIGIN`: Frontend URL (default: http://localhost:3000)

3. **Start the services**

   ```bash
   docker-compose up -d
   ```

   This will:
   - Pull the PostgreSQL image with pgvector extension
   - Build the backend application
   - Start both services with proper networking
   - Create a persistent volume for the database
   - **Automatically run database migrations** on backend startup

4. **Check service status**

   ```bash
   docker-compose ps
   ```

5. **View logs**

   ```bash
   # All services
   docker-compose logs -f

   # Backend only
   docker-compose logs -f backend

   # PostgreSQL only
   docker-compose logs -f postgres
   ```

## Database Management

### Automatic Migrations

Database migrations run automatically when the backend container starts via the `start.sh` script. You don't need to run them manually!

If you need to run migrations manually for any reason:

```bash
docker-compose exec backend node dist/db/migrate.js
```

### Seed Database (Optional)

You have two options for seeding the database with the 15 AI/ML documentation files:

**Option 1: Automatic seeding on startup (requires rebuild)**

Set the `RUN_SEED` environment variable in your `.env` or `docker-compose.yml`:
```bash
RUN_SEED=true
```

Then restart:
```bash
docker-compose up -d --build backend
```

⚠️ **Note:** The first run incurs OpenAI API costs (~$0.01-0.02) for generating embeddings. Docs already in the database are skipped on later runs.

**Option 2: Manual seeding**

Run the seed command manually after startup (the production image only contains compiled JS, so use `node` rather than `npm run`):
```bash
docker-compose exec backend node dist/db/seed-embeddings.js
```

### Access PostgreSQL

Connect to the database directly:

```bash
docker-compose exec postgres psql -U postgres -d rag_chatbot
```

Or use external tools with:
- Host: localhost
- Port: 5432
- Database: rag_chatbot
- User: postgres
- Password: (from your .env file)

## Service Endpoints

- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

## Common Commands

### Stop services
```bash
docker-compose down
```

### Stop services and remove volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### Rebuild backend after code changes
```bash
docker-compose up -d --build backend
```

### Restart a specific service
```bash
docker-compose restart backend
```

### Execute commands in backend container
```bash
docker-compose exec backend <command>
```

## Troubleshooting

### Backend fails to connect to database

Check if PostgreSQL is healthy:
```bash
docker-compose ps
```

If postgres is unhealthy, check logs:
```bash
docker-compose logs postgres
```

### Port already in use

If ports 3001 or 5432 are already in use, you can modify them in `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"  # Use port 3002 on host instead of 3001
```

### Rebuild from scratch

If you encounter persistent issues:

```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker-compose rm -f
docker rmi rag-chatbot-backend

# Start fresh
docker-compose up -d --build
```

### View backend application logs in real-time

```bash
docker-compose logs -f backend
```

## Development Workflow

### Making code changes

1. Edit your code locally
2. Rebuild the backend service:
   ```bash
   docker-compose up -d --build backend
   ```

### Using with frontend

Make sure the frontend's API endpoint points to:
```
http://localhost:3001
```

## Production Considerations

For production deployments:

1. **Use secrets management** for sensitive values instead of .env files
2. **Set strong passwords** for database
3. **Configure proper CORS origins** 
4. **Use environment-specific configurations**
5. **Set up proper logging and monitoring**
6. **Use a reverse proxy** (nginx, traefik) in front of the backend
7. **Enable SSL/TLS** for all connections
8. **Regular database backups**:
   ```bash
   docker-compose exec postgres pg_dump -U postgres rag_chatbot > backup.sql
   ```

## Architecture

The Docker Compose setup includes:

- **postgres**: PostgreSQL 16 with pgvector extension for vector similarity search
- **backend**: Node.js application built from Dockerfile
- **postgres_data**: Named volume for database persistence
- **rag-network**: Bridge network for service communication

## Environment Variables Reference

See `.env.docker` for a complete list of available environment variables and their descriptions.

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
