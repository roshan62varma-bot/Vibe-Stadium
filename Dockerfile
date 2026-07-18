# Use Node.js base image
FROM node:20-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./

# Copy shared libraries
COPY lib ./lib/

# Copy API server project
COPY artifacts/api-server ./artifacts/api-server/

# Copy frontend client project
COPY artifacts/vibe-stadium ./artifacts/vibe-stadium/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Build shared libraries
RUN pnpm run typecheck:libs

# Build the API server
RUN pnpm --filter @workspace/api-server run build

# Build the frontend client
RUN PORT=8080 BASE_PATH=/ pnpm --filter @workspace/vibe-stadium run build

# Production runtime stage
FROM node:20-slim

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./

# Copy built dependencies and compiled directories from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/artifacts/api-server ./artifacts/api-server
COPY --from=builder /app/artifacts/vibe-stadium ./artifacts/vibe-stadium

# Cloud Run automatically sets and uses the PORT environment variable (defaulting to 8080)
EXPOSE 8080

# Start the Express API server
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
