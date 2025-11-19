# 📝 Changelog

## Latest Updates

### Navigation Improvements
- ✅ **Clickable Logo**: BookClub title in navbar now redirects to home page
- Click the logo from any page to return to the list view

### Genre Filtering Redesign
- ✅ **Search-Based Genre Selection**: Instead of showing all genres as tags, now uses a search input
- Type to search for genres and click to add
- Selected genres appear as tags above the search box
- Real-time genre suggestions while typing
- Remove genres by clicking the × button

### Genre Autocomplete (Upload Page)
- ✅ **Smart Genre Suggestions**: When adding books, typing a genre shows existing genres
- Helps prevent duplicate genres with different cases
- Shows "existing" badge for database genres
- Press Space to add custom genre or click suggestion
- Reduces genre fragmentation in the database

### Docker Architecture Changes
- ✅ **Separate Dockerfiles**: Split into `backend.Dockerfile` and `frontend.Dockerfile`
- ✅ **New Port Configuration**:
  - Backend (API): Port **6310**
  - Frontend: Port **6311**
- ✅ **Docker Compose**: Orchestrates both services with proper networking
- ✅ **Nginx Frontend**: Frontend now served by Nginx in production
- ✅ **Service Discovery**: Docker networking allows frontend to reach backend

## Port Changes Summary

| Service | Old Port | New Port |
|---------|----------|----------|
| Backend | 3001 | 6310 |
| Frontend (Dev) | 5173 | 5173 (unchanged) |
| Frontend (Prod) | 3001 | 6311 |

## Migration Notes

### Development
No changes needed! Run as usual:
```bash
npm run dev:full
```
- Backend automatically uses port 6310
- Frontend dev server stays on 5173
- Vite proxy updated to point to 6310

### Docker Production
Use the new Docker Compose setup:
```bash
# Old way (single container)
docker build -t bookclub .
docker run -p 3001:3001 bookclub

# New way (microservices)
docker-compose up -d
# Frontend: http://localhost:6311
# Backend: http://localhost:6310
```

## File Changes

### New Files
- `backend.Dockerfile` - Backend container configuration
- `frontend.Dockerfile` - Frontend container with Nginx
- `nginx.conf` - Nginx configuration for frontend
- `docker-compose.yml` - Orchestration for both services
- `DOCKER_GUIDE.md` - Comprehensive Docker documentation

### Modified Files
- `src/App.jsx` - Added clickable Logo component
- `src/components/GenreFilter.jsx` - Redesigned with search input
- `src/components/GenreFilter.css` - Updated styles for search UI
- `src/components/GenreTagInput.jsx` - Added autocomplete suggestions
- `src/components/GenreTagInput.css` - Added suggestion dropdown styles
- `server/server.js` - Changed default port to 6310
- `vite.config.js` - Updated proxy target to 6310
- `package.json` - Updated server script port
- `README.md` - Updated with new ports and Docker info
- `QUICKSTART.md` - Updated port references

### Deleted Files
- `Dockerfile` - Replaced by separate backend/frontend Dockerfiles

## Breaking Changes

### For Existing Docker Users
If you were using the old monolithic Dockerfile:

1. **Stop old container:**
```bash
docker stop bookclub
docker rm bookclub
```

2. **Use new Docker Compose:**
```bash
docker-compose up -d
```

3. **Update port mappings** in any reverse proxy or firewall rules:
- Change 3001 → 6310 (backend)
- Add 6311 (frontend)

### For API Consumers
If you were calling the API directly:
- Update base URL from `http://localhost:3001` to `http://localhost:6310`
- Frontend users automatically proxy through Nginx (no change needed)

## Benefits

### Genre Selection
- 🎯 **Cleaner UI**: No overwhelming list of genre tags
- 🔍 **Searchable**: Find genres quickly by typing
- ✨ **Smart**: Suggests existing genres to maintain consistency
- 📊 **Scalable**: Works with hundreds of genres

### Docker Architecture
- 🔄 **Microservices**: Frontend and backend can scale independently
- 🚀 **Performance**: Nginx serves static files efficiently
- 🔧 **Maintainability**: Separate concerns, easier updates
- 📦 **Production-Ready**: Industry-standard architecture
- 🔐 **Security**: Nginx acts as reverse proxy

### Navigation
- 🏠 **Quick Home**: Click logo from anywhere to go home
- 👆 **Intuitive**: Standard web pattern users expect
- ⚡ **Fast**: Instant navigation without page reload

## Technical Details

### Nginx Configuration
- Serves React app from `/usr/share/nginx/html`
- Proxies `/api/*` requests to backend
- Handles React Router with fallback to `index.html`
- Gzip compression enabled
- 1-year caching for static assets

### Docker Networking
- Both services on `bookclub-network` bridge
- Frontend reaches backend via hostname `backend`
- Isolated from host network (except exposed ports)

### Genre Autocomplete
- Fetches genres from `/api/genres` on component mount
- Filters suggestions client-side as user types
- Shows top 5 matching genres
- Prevents duplicate selection

## Upgrade Guide

### From Previous Version

1. **Pull latest code:**
```bash
git pull origin main
```

2. **Install any new dependencies:**
```bash
npm install
```

3. **Restart development servers:**
```bash
npm run dev:full
```

4. **For Docker users:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Future Enhancements

Possible additions based on this architecture:
- [ ] Multiple backend replicas with load balancing
- [ ] Redis caching layer
- [ ] CDN for static assets
- [ ] Advanced genre analytics
- [ ] Genre synonyms and aliases
- [ ] Favorite genres per user (with auth)

## Version

**Current Version**: 2.0.0
**Release Date**: November 2025
**Status**: Stable

---

For detailed Docker instructions, see [DOCKER_GUIDE.md](DOCKER_GUIDE.md).

For quick start, see [QUICKSTART.md](QUICKSTART.md).

