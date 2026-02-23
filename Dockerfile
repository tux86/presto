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

RUN cd packages/backend && bun build src/index.ts --outdir dist --target bun

# ── Stage 2: Runtime ─────────────────────────────────────
FROM oven/bun:1-debian

RUN groupadd --system --gid 1001 presto && \
    useradd --system --uid 1001 --gid presto --no-create-home presto

WORKDIR /app

# Install runtime DB drivers. The bundled dist/index.js is self-contained
# but needs native driver packages available at runtime.
RUN echo '{"dependencies":{"pg":"^8.18.0","mysql2":"^3.14.0"}}' > package.json && \
    bun install --production && \
    rm package.json

# Copy built artifacts into a flat production layout:
#   /app/dist/index.js      — backend bundle
#   /app/public/             — frontend static files
#   /app/dist/migrations/    — Drizzle SQL migration files
COPY --from=builder --link /app/packages/backend/dist dist
COPY --from=builder --link /app/packages/frontend/dist public
COPY --from=builder --link /app/packages/backend/src/db/migrations dist/migrations

ENV PORT=8080
USER presto
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

# Migrations run programmatically inside the app at startup
CMD ["bun", "./dist/index.js"]
