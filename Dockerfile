# Single-stage build: Bun workspace + Prisma's hoisting behavior makes
# multi-stage artifact collection unreliable across bun versions.
# Since the runtime is also bun, single-stage is the pragmatic choice.
FROM oven/bun:1-debian

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

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
COPY packages/backend/ packages/backend/

# Build frontend (tsc -b + vite build via package script)
RUN cd packages/frontend && bun run build

# Generate Prisma client and build backend
# DATABASE_URL is required by prisma.config.ts at load time, even for generate
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd packages/backend && bunx prisma generate && \
    bun build src/index.ts --outdir dist --target bun

# Move frontend dist into backend's public dir for static serving
RUN mv packages/frontend/dist packages/backend/public

RUN chmod +x /app/packages/backend/docker-entrypoint.sh

ENV PORT=8080

USER presto

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/packages/backend/docker-entrypoint.sh"]
