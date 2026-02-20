# Single-stage build: bun workspace + Prisma's hoisting behavior makes
# multi-stage artifact collection unreliable across bun versions.
# Since the runtime is also bun, single-stage is the pragmatic choice.
FROM oven/bun:1

# Create non-root user early
RUN groupadd --system --gid 1001 presto && \
    useradd --system --uid 1001 --gid presto --no-create-home presto

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer caching
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN bun install --frozen-lockfile

# Copy source code (changes here don't invalidate the install layer above)
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

# Generate Prisma client and build
RUN cd packages/backend && bunx prisma generate
RUN cd packages/backend && bun build src/index.ts --outdir dist --target bun

COPY packages/backend/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Switch to non-root user (files are root-owned but world-readable)
USER presto

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
