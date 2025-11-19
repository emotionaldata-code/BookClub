# 🐳 Docker Setup - Quick Reference

## Two Independent Containers (Orchestrator-Ready)

Both containers are fully configurable via environment variables.

### Backend (Default Port 6310)
```bash
# Build
docker build -f backend.Dockerfile -t bookclub-backend .

# Run with defaults
docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Run with custom configuration
docker run -d \
  --name bookclub-backend \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -v bookclub-data:/app/server \
  bookclub-backend
```

### Frontend (Default Port 6311)
```bash
# Build
docker build -f frontend.Dockerfile -t bookclub-frontend .

# Run with defaults (connects to http://backend:6310)
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  bookclub-frontend

# Run with custom configuration
docker run -d \
  --name bookclub-frontend \
  -p 8080:8080 \
  -e PORT=8080 \
  -e BACKEND_URL=http://my-backend-service:6310 \
  bookclub-frontend
```

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 6310 | Server port |
| NODE_ENV | production | Environment mode |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 6311 | Server port |
| BACKEND_URL | http://backend:6310 | Backend API URL |

## Access

- Backend API: **http://localhost:6310**
- Frontend: **http://localhost:6311**

## Volume

Backend uses volume `bookclub-data` at `/app/server` for SQLite database persistence.

Create volume:
```bash
docker volume create bookclub-data
```

## Complete Example

```bash
# Create volume
docker volume create bookclub-data

# Build images
docker build -f backend.Dockerfile -t bookclub-backend .
docker build -f frontend.Dockerfile -t bookclub-frontend .

# Run backend
docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Run frontend
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e BACKEND_URL=http://localhost:6310 \
  bookclub-frontend

# Check status
docker ps
docker logs bookclub-backend
docker logs bookclub-frontend

# Test
curl http://localhost:6310/api/health
curl http://localhost:6311
```

## Container Orchestrator Example (Kubernetes-style)

```bash
# Backend in orchestrator will be accessible at http://backend:6310
docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# Frontend configured to use backend service name
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e BACKEND_URL=http://backend:6310 \
  bookclub-frontend
```

## Stop/Remove

```bash
# Stop
docker stop bookclub-backend bookclub-frontend

# Remove
docker rm bookclub-backend bookclub-frontend

# Remove images
docker rmi bookclub-backend bookclub-frontend

# Remove volume (deletes database!)
docker volume rm bookclub-data
```

---

**For detailed documentation, see:**
- [DOCKER_INDEPENDENT.md](DOCKER_INDEPENDENT.md) - Complete guide with all scenarios
- [README.md](README.md) - Full project documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide

