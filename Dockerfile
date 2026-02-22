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

# ── Stage 2: Runtime ─────────────────────────────────────
FROM oven/bun:1-debian

RUN groupadd --system --gid 1001 presto && \
    useradd --system --uid 1001 --gid presto --no-create-home presto

WORKDIR /app

# Install only prisma CLI + dotenv (needed for entrypoint migrations and prisma.config.ts).
# The bundled dist/index.js is self-contained and needs no other node_modules.
RUN echo '{"dependencies":{"prisma":"^7.4.1","dotenv":"^17.3.1"}}' > package.json && \
    bun install --production && \
    rm package.json

# Copy built artifacts into a flat production layout:
#   /app/dist/index.js   — backend bundle
#   /app/public/          — frontend static files
#   /app/prisma/          — schema, migrations, generated client
COPY --from=builder --link /app/packages/backend/dist dist
COPY --from=builder --link /app/packages/frontend/dist public
COPY --from=builder --link /app/packages/backend/prisma/generated prisma/generated
COPY --from=builder --link /app/packages/backend/prisma/schema.prisma prisma/schema.prisma
COPY --from=builder --link /app/packages/backend/prisma/migrations prisma/migrations
COPY --link packages/backend/prisma.config.ts prisma.config.ts
COPY --link packages/backend/docker-entrypoint.sh docker-entrypoint.sh

ENV PORT=8080
USER presto
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
