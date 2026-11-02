# ── Build ────────────────────────────────────────────────────────────────────
FROM oven/bun:1-debian AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json vite.config.ts index.html ./
COPY public/ public/
COPY src/ src/
COPY scripts/backup.ts scripts/backup.ts

RUN bun run build
RUN bun build src/server/index.ts --target bun --outfile dist/server.js
# Shipped so `docker exec presto bun dist/backup.js` works without the source tree.
RUN bun build scripts/backup.ts --target bun --outfile dist/backup.js
# `docker exec -i presto bun dist/mcp.js` gives a local agent MCP over stdio.
RUN bun build src/server/stdio.ts --target bun --outfile dist/mcp.js
# pdfkit loads its standard fonts (Helvetica…) at runtime through its own
# "#standard-fonts/*" import map, which the bundler cannot inline. Ship the
# fonts next to the bundles, with a package.json that maps that specifier.
RUN cp -r node_modules/pdfkit/js/standard-fonts dist/standard-fonts \
 && echo '{"imports":{"#standard-fonts/*":"./standard-fonts/*.cjs"}}' > dist/package.json

# ── Runtime ──────────────────────────────────────────────────────────────────
# The server is a single bundled file and SQLite is built into Bun, so the
# runtime image carries no node_modules at all.
FROM oven/bun:1-alpine
WORKDIR /app

RUN addgroup -S -g 1001 presto \
 && adduser -S -u 1001 -G presto -H presto \
 && mkdir -p /data && chown presto:presto /data

COPY --from=build --chown=presto:presto /app/dist/server.js dist/server.js
COPY --from=build --chown=presto:presto /app/dist/backup.js dist/backup.js
COPY --from=build --chown=presto:presto /app/dist/mcp.js    dist/mcp.js
COPY --from=build --chown=presto:presto /app/dist/ui        dist/ui
COPY --from=build --chown=presto:presto /app/dist/standard-fonts dist/standard-fonts
COPY --from=build --chown=presto:presto /app/dist/package.json   dist/package.json

ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]
USER presto

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "dist/server.js"]
