#!/bin/sh
set -e

cd /app

echo "Running database migrations..."
bunx prisma migrate deploy

echo "Starting Presto..."
exec bun ./dist/index.js
