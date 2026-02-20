# Stage 1: Build
FROM oven/bun:1 AS build

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/backend/package.json packages/backend/package.json

RUN bun install --frozen-lockfile

# Copy source code (changes here don't invalidate the install layer above)
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/

# Type checking (tsc -b) is handled in CI, not in the image build
RUN cd packages/frontend && ./node_modules/.bin/vite build

# Stage 2: Serve
FROM nginx:alpine

COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
