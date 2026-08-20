# ── Build ────────────────────────────────────────────────────────────────────
FROM oven/bun:1-debian AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json vite.config.ts index.html ./
COPY public/ public/
COPY src/ src/

RUN bun run build
RUN bun build src/server/index.ts --target bun --outfile dist/server.js

# ── Runtime ──────────────────────────────────────────────────────────────────
# The server is a single bundled file and SQLite is built into Bun, so the
# runtime image carries no node_modules at all.
FROM oven/bun:1-alpine
WORKDIR /app

RUN addgroup -S -g 1001 presto \
 && adduser -S -u 1001 -G presto -H presto \
 && mkdir -p /data && chown presto:presto /data

COPY --from=build --chown=presto:presto /app/dist/server.js dist/server.js
COPY --from=build --chown=presto:presto /app/dist/ui        dist/ui

ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]
USER presto

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "dist/server.js"]
