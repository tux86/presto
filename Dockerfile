# ── Stage 1: Builder ─────────────────────────────────────
FROM oven/bun:1-debian AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN bun install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
COPY packages/backend/ packages/backend/

RUN cd packages/frontend && bun run build

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd packages/backend && bunx prisma generate && \
    bun build src/index.ts --outdir dist --target bun

# Move frontend build output into backend's static serving directory
RUN mv packages/frontend/dist packages/backend/public

# Reinstall with production deps only (strip devDependencies).
# Remove the "prepare" script first — it runs husky which is a devDependency.
RUN rm -rf node_modules && \
    sed -i '/"prepare":/d' package.json && \
    bun install --production

# ── Stage 2: Runtime ─────────────────────────────────────
FROM oven/bun:1-debian

RUN groupadd --system --gid 1001 presto && \
    useradd --system --uid 1001 --gid presto --no-create-home presto

WORKDIR /app

# Copy workspace manifests (needed for bun's module resolution with hoisted node_modules)
COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
# Frontend manifest required — bun's workspace lockfile expects all members present
COPY packages/frontend/package.json packages/frontend/package.json

# Copy production node_modules from builder (root + workspace symlinks)
COPY --from=builder --link /app/node_modules node_modules
COPY --from=builder --link /app/packages/backend/node_modules packages/backend/node_modules
COPY --from=builder --link /app/packages/shared/node_modules packages/shared/node_modules

# Copy built artifacts from builder
COPY --from=builder --link /app/packages/backend/dist packages/backend/dist
COPY --from=builder --link /app/packages/backend/public packages/backend/public
COPY --from=builder --link /app/packages/backend/prisma/generated packages/backend/prisma/generated
COPY --from=builder --link /app/packages/backend/prisma/schema.prisma packages/backend/prisma/schema.prisma
COPY --from=builder --link /app/packages/backend/prisma/migrations packages/backend/prisma/migrations
COPY --link packages/backend/prisma.config.ts packages/backend/prisma.config.ts
COPY --link packages/backend/docker-entrypoint.sh packages/backend/docker-entrypoint.sh

ENV PORT=8080
USER presto
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/packages/backend/docker-entrypoint.sh"]
