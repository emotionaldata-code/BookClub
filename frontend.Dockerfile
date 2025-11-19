# Frontend Dockerfile for BookClub React App
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY src/ ./src/
COPY index.html ./
COPY vite.config.js ./

# Build the frontend (API URL will be configured at runtime via proxy)
RUN npm run build

# Copy the frontend server script
COPY frontend-server.js ./

# Expose frontend port (configurable via PORT env var)
EXPOSE 6311

# Start the frontend server (serves static files and proxies API requests)
CMD ["node", "frontend-server.js"]

