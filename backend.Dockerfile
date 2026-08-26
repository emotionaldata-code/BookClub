# Backend Dockerfile for BookClub API Server
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy server files. Book data is stored exclusively in PostgreSQL.
COPY server/ ./server/

# Expose backend port (configurable via PORT env var)
EXPOSE 6310

# Start the backend server
CMD ["node", "server/server.js"]
