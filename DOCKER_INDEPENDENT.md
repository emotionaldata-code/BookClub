# 🐳 Independent Docker Deployment

This guide shows how to run the backend and frontend as **separate, independent Docker containers** with full environment variable configuration - perfect for container orchestrators.

## Architecture

- **Backend**: Express + SQLite API server (Default Port 6310)
- **Frontend**: React app with built-in proxy server (Default Port 6311)
- Both containers run independently with configurable environment variables
- No Docker Compose needed
- Orchestrator-ready (Kubernetes, Docker Swarm, etc.)

---

## 🚀 Quick Start

### 1. Build the Images

```bash
# Build backend
docker build -f backend.Dockerfile -t bookclub-backend .

# Build frontend
docker build -f frontend.Dockerfile -t bookclub-frontend .
```

### 2. Run the Containers

```bash
# Create volume for database persistence
docker volume create bookclub-data

# Run backend
docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -e PORT=6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Run frontend
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e PORT=6311 \
  -e BACKEND_URL=http://localhost:6310 \
  bookclub-frontend
```

### 3. Access the Application

- **Frontend**: http://localhost:6311
- **Backend API**: http://localhost:6310/api/health

---

## 📦 Backend Container

### Build

```bash
docker build -f backend.Dockerfile -t bookclub-backend .
```

### Run

**With defaults (Port 6310):**
```bash
docker volume create bookclub-data

docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend
```

**With custom port:**
```bash
docker run -d \
  --name bookclub-backend \
  -p 8080:8080 \
  -e PORT=8080 \
  -v bookclub-data:/app/server \
  bookclub-backend
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 6310 | Server port |
| `NODE_ENV` | production | Environment mode |

### Volume

- **Path**: `/app/server`
- **Purpose**: SQLite database persistence
- **Files**: `bookclub.db`, `bookclub.db-shm`, `bookclub.db-wal`

### Verify

```bash
# Check logs
docker logs bookclub-backend

# Test API
curl http://localhost:6310/api/health
curl http://localhost:6310/api/books
```

---

## 🎨 Frontend Container

### Build

```bash
docker build -f frontend.Dockerfile -t bookclub-frontend .
```

### Run

**With defaults (connects to http://backend:6310):**
```bash
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  bookclub-frontend
```

**With custom backend URL:**
```bash
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e BACKEND_URL=http://localhost:6310 \
  bookclub-frontend
```

**With custom port and backend:**
```bash
docker run -d \
  --name bookclub-frontend \
  -p 8080:8080 \
  -e PORT=8080 \
  -e BACKEND_URL=http://my-backend:6310 \
  bookclub-frontend
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 6311 | Server port |
| `BACKEND_URL` | http://backend:6310 | Backend API URL |

### How It Works

The frontend container:
1. Serves built React static files from `/app/dist`
2. Proxies `/api/*` requests to the `BACKEND_URL`
3. Handles React Router for client-side routing

This allows the frontend to:
- Run independently as a single container
- Configure the backend URL at runtime via environment variable
- Work with container orchestrators where services have DNS names

### Verify

```bash
# Check logs
docker logs bookclub-frontend

# Test frontend
curl http://localhost:6311
```

---

## 🔧 Container Orchestrator Setup

### Example: Using Service Names

When running in an orchestrator (Kubernetes, Docker Swarm, etc.), services typically have internal DNS names:

```bash
# Backend runs with service name "backend"
docker run -d \
  --name backend \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Frontend connects to backend via service name
docker run -d \
  --name frontend \
  -p 6311:6311 \
  -e BACKEND_URL=http://backend:6310 \
  bookclub-frontend
```

### Example: Custom Ports

```bash
# Backend on port 3000
docker run -d \
  --name bookclub-backend \
  -p 3000:3000 \
  -e PORT=3000 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Frontend on port 80, pointing to backend on 3000
docker run -d \
  --name bookclub-frontend \
  -p 80:80 \
  -e PORT=80 \
  -e BACKEND_URL=http://backend:3000 \
  bookclub-frontend
```

### Example: Docker Network

```bash
# Create a network
docker network create bookclub-network

# Run backend
docker run -d \
  --name bookclub-backend \
  --network bookclub-network \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Run frontend (can access backend via container name)
docker run -d \
  --name bookclub-frontend \
  --network bookclub-network \
  -p 6311:6311 \
  -e BACKEND_URL=http://bookclub-backend:6310 \
  bookclub-frontend
```

---

## 🛠️ Management Commands

### View Logs

```bash
# Backend logs
docker logs bookclub-backend
docker logs -f bookclub-backend  # Follow mode

# Frontend logs
docker logs bookclub-frontend
docker logs -f bookclub-frontend  # Follow mode
```

### Restart Containers

```bash
docker restart bookclub-backend
docker restart bookclub-frontend
```

### Stop Containers

```bash
docker stop bookclub-backend
docker stop bookclub-frontend
```

### Start Containers

```bash
docker start bookclub-backend
docker start bookclub-frontend
```

### Remove Containers

```bash
docker rm bookclub-backend
docker rm bookclub-frontend

# Force remove running containers
docker rm -f bookclub-backend bookclub-frontend
```

### Rebuild Images

```bash
# Rebuild backend
docker build -f backend.Dockerfile -t bookclub-backend .

# Rebuild frontend
docker build -f frontend.Dockerfile -t bookclub-frontend .

# Rebuild with no cache
docker build --no-cache -f backend.Dockerfile -t bookclub-backend .
docker build --no-cache -f frontend.Dockerfile -t bookclub-frontend .
```

---

## 💾 Database Management

### Backup Database

```bash
# From volume
docker run --rm \
  -v bookclub-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/bookclub-backup.tar.gz -C /data .

# Or from running container
docker exec bookclub-backend sqlite3 /app/server/bookclub.db .dump > backup.sql
```

### Restore Database

```bash
# From backup
docker run --rm \
  -v bookclub-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/bookclub-backup.tar.gz -C /data

# Or from SQL dump
cat backup.sql | docker exec -i bookclub-backend sqlite3 /app/server/bookclub.db
```

### Inspect Database

```bash
# Connect to SQLite shell
docker exec -it bookclub-backend sqlite3 /app/server/bookclub.db

# Run SQL query
docker exec bookclub-backend sqlite3 /app/server/bookclub.db "SELECT COUNT(*) FROM books;"

# List all books
docker exec bookclub-backend sqlite3 /app/server/bookclub.db "SELECT title FROM books;"
```

### Reset Database

```bash
# Stop backend
docker stop bookclub-backend

# Remove volume
docker volume rm bookclub-data

# Recreate volume
docker volume create bookclub-data

# Start backend (will reinitialize from books/ folder)
docker start bookclub-backend
```

---

## 🐛 Troubleshooting

### Backend Issues

**Can't connect to backend:**
```bash
# Check if container is running
docker ps | grep bookclub-backend

# Check logs
docker logs bookclub-backend

# Check port binding
docker port bookclub-backend

# Test directly
curl http://localhost:6310/api/health
```

**Database issues:**
```bash
# Check if database exists
docker exec bookclub-backend ls -la /app/server/

# Check database permissions
docker exec bookclub-backend stat /app/server/bookclub.db

# Reinitialize database
docker exec bookclub-backend node server/init-db.js --force
```

### Frontend Issues

**Can't access frontend:**
```bash
# Check if container is running
docker ps | grep bookclub-frontend

# Check logs
docker logs bookclub-frontend

# Check port binding
docker port bookclub-frontend
```

**API requests failing:**
```bash
# Check backend URL configuration
docker inspect bookclub-frontend | grep BACKEND_URL

# Update backend URL
docker stop bookclub-frontend
docker rm bookclub-frontend
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e BACKEND_URL=http://YOUR_BACKEND_URL:6310 \
  bookclub-frontend
```

### Container Logs

```bash
# View last 50 lines
docker logs --tail 50 bookclub-backend
docker logs --tail 50 bookclub-frontend

# Follow logs in real-time
docker logs -f bookclub-backend
docker logs -f bookclub-frontend

# View logs with timestamps
docker logs -t bookclub-backend
```

### Health Checks

```bash
# Backend health
curl http://localhost:6310/api/health

# Frontend health
curl http://localhost:6311

# Backend API
curl http://localhost:6310/api/books

# Backend genres
curl http://localhost:6310/api/genres
```

---

## 🚀 Production Best Practices

### 1. Use Volumes for Persistence

Always mount a volume for the backend database:

```bash
docker volume create bookclub-data
docker run -d \
  -v bookclub-data:/app/server \
  bookclub-backend
```

### 2. Configure Resource Limits

```bash
# Backend with resource limits
docker run -d \
  --name bookclub-backend \
  --memory="512m" \
  --cpus="0.5" \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Frontend with resource limits
docker run -d \
  --name bookclub-frontend \
  --memory="256m" \
  --cpus="0.25" \
  -p 6311:6311 \
  -e BACKEND_URL=http://backend:6310 \
  bookclub-frontend
```

### 3. Use Health Checks

```bash
docker run -d \
  --name bookclub-backend \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:6310/api/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend
```

### 4. Use Restart Policies

```bash
docker run -d \
  --name bookclub-backend \
  --restart unless-stopped \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

docker run -d \
  --name bookclub-frontend \
  --restart unless-stopped \
  -p 6311:6311 \
  -e BACKEND_URL=http://backend:6310 \
  bookclub-frontend
```

### 5. Secure Configuration

```bash
# Run as non-root user (already configured in Dockerfiles)
# Use environment variables for sensitive data
# Don't expose ports unnecessarily
# Use internal networks where possible

# Example: Internal network
docker network create --internal bookclub-internal
docker run -d \
  --name bookclub-backend \
  --network bookclub-internal \
  -v bookclub-data:/app/server \
  bookclub-backend

# Frontend in public network, backend in internal
docker network create bookclub-public
docker network connect bookclub-public bookclub-frontend
```

---

## 📚 Complete Example

Here's a complete production-ready setup:

```bash
#!/bin/bash

# Configuration
BACKEND_PORT=6310
FRONTEND_PORT=6311
VOLUME_NAME=bookclub-data
NETWORK_NAME=bookclub-network

# Create resources
docker volume create $VOLUME_NAME
docker network create $NETWORK_NAME

# Build images
docker build -f backend.Dockerfile -t bookclub-backend:latest .
docker build -f frontend.Dockerfile -t bookclub-frontend:latest .

# Run backend
docker run -d \
  --name bookclub-backend \
  --network $NETWORK_NAME \
  --restart unless-stopped \
  --memory="512m" \
  --cpus="0.5" \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:$BACKEND_PORT/api/health || exit 1" \
  --health-interval=30s \
  -p $BACKEND_PORT:$BACKEND_PORT \
  -e PORT=$BACKEND_PORT \
  -e NODE_ENV=production \
  -v $VOLUME_NAME:/app/server \
  bookclub-backend:latest

# Wait for backend to be healthy
echo "Waiting for backend to be healthy..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' bookclub-backend)" = "healthy" ]; do
  sleep 2
done

# Run frontend
docker run -d \
  --name bookclub-frontend \
  --network $NETWORK_NAME \
  --restart unless-stopped \
  --memory="256m" \
  --cpus="0.25" \
  -p $FRONTEND_PORT:$FRONTEND_PORT \
  -e PORT=$FRONTEND_PORT \
  -e BACKEND_URL=http://bookclub-backend:$BACKEND_PORT \
  bookclub-frontend:latest

# Show status
echo ""
echo "BookClub is now running!"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend: http://localhost:$BACKEND_PORT"
echo ""
docker ps | grep bookclub
```

---

## 📖 Additional Resources

- [Main README](README.md) - Project overview and development setup
- [DOCKER_README.md](DOCKER_README.md) - Quick Docker reference
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migration from file-based to SQLite

---

## ❓ FAQ

**Q: Can I change ports without rebuilding?**  
A: Yes! Both containers accept `PORT` environment variable at runtime.

**Q: How do I point frontend to a different backend?**  
A: Set the `BACKEND_URL` environment variable when running the frontend container.

**Q: Do I need Docker Compose?**  
A: No, both containers are fully independent and can be run separately.

**Q: Can I use this with Kubernetes?**  
A: Yes! Both containers are designed to work with any container orchestrator. Use ConfigMaps for environment variables.

**Q: Where is the database stored?**  
A: In the Docker volume mounted at `/app/server`. Always use a volume for persistence.

**Q: How do I update the application?**  
A: Rebuild the images, stop the old containers, and start new ones with the same volumes.

**Q: Can I run multiple instances?**  
A: Yes for backend (with load balancing). Frontend can have multiple instances too.
