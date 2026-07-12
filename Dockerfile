# ==========================================
# Stage 1: Build stage
# ==========================================
FROM node:20 AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install all development and production dependencies
RUN npm ci

# Copy application source code (excluding ignored files)
COPY . .

# Build the client-side bundle and transpile the Express entrypoint
RUN npm run build

# ==========================================
# Stage 2: Production runner stage
# ==========================================
FROM node:20-slim AS runner

# Create data directory for persistent SQLite storage and ensure user ownership
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app

WORKDIR /usr/src/app

# Set non-interactive debian frontend
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests for installing production-only dependencies
COPY --chown=node:node package*.json ./

# Install system dependencies (needed for compiling native better-sqlite3 code in case no prebuilt binary is loaded),
# install production node modules, and clean up to keep image lightweight.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && npm ci --omit=dev \
    && apt-get purge -y --auto-remove python3 make g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built bundles from builder stage
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist

# Use secure, non-privileged system user "node"
USER node

# Volumize sqlite data path to protect persistent database and covers
VOLUME ["/usr/src/app/data"]

EXPOSE 3000

# Start server using production runner
CMD ["npm", "run", "start"]
