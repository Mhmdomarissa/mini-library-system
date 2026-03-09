# -------- Build stage --------
# Compiles TypeScript to JS; includes all devDependencies (tsc, type stubs, etc.)
FROM node:24-alpine AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer caching — only re-runs
# npm ci when package*.json changes, not on every source change.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# -------- Production stage --------
# Starts fresh from a clean image — no TypeScript compiler, no dev deps,
# no source files. Only the compiled JS and production node_modules ship.
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Pull compiled output from builder
COPY --from=builder /app/dist ./dist

# Documents the port the app listens on (actual value driven by PORT env var).
# Default fallback in server.ts is 3000; .env / env_file sets it to 4000.
EXPOSE 4000

CMD ["node", "dist/server.js"]
