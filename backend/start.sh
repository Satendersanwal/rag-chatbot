#!/bin/sh
set -e

echo "🔄 Running database migrations..."
node dist/db/migrate.js

# Optional seeding - controlled by RUN_SEED environment variable
if [ "${RUN_SEED}" = "true" ]; then
  echo "🌱 Seeding database with markdown documents..."
  node dist/db/seed-embeddings.js
else
  echo "⏭️  Skipping database seeding (set RUN_SEED=true to enable)"
fi

echo "🚀 Starting application..."
exec node dist/index.js

