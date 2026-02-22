#!/bin/sh
set -e

cd /app/packages/backend

echo "Running database migrations..."
bunx prisma migrate deploy

echo "Starting Presto backend..."
exec bun ./dist/index.js
