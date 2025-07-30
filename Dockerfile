# Multi-stage Docker build for QzonMe
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 qzonme

# Copy built application
COPY --from=builder --chown=qzonme:nodejs /app/dist ./dist
COPY --from=builder --chown=qzonme:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=qzonme:nodejs /app/package*.json ./

# Copy production dependencies
COPY --from=deps --chown=qzonme:nodejs /app/node_modules ./node_modules

# Create directories for uploads and contact messages if needed
RUN mkdir -p temp_uploads uploads contact_messages && chown -R qzonme:nodejs temp_uploads uploads contact_messages

# Switch to non-root user
USER qzonme

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
