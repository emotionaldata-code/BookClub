# 🚀 Quick Start Guide

## Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the application (both frontend and backend)
npm run dev:full
```

**That's it!** The database will automatically initialize on first run.

- Frontend: http://localhost:5173
- Backend API: http://localhost:6310

## Database Initialization

### ✅ What Happens on First Run
- SQLite database is created at `server/bookclub.db`
- All books from `books/` folder are loaded
- You'll see: `✓ Database initialized for the first time`

### ✅ What Happens on Subsequent Runs
- Existing database is used (data persists!)
- You'll see: `Database ready with X books.`

### 🔄 How to Reload Books After Adding New Ones

**Option 1: Using the init script (Recommended)**
```bash
node server/init-db.js --force
```

**Option 2: Using the API**
```bash
curl -X POST http://localhost:6310/api/reinitialize
```

**Option 3: Delete and restart**
```bash
rm server/bookclub.db
npm run server
```

## Docker Production Deployment

Both containers are fully configurable via environment variables!

### Backend

```bash
# Build and run
docker build -f backend.Dockerfile -t bookclub-backend .
docker volume create bookclub-data
docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -e PORT=6310 \
  -v bookclub-data:/app/server \
  bookclub-backend
```

### Frontend

```bash
# Build and run
docker build -f frontend.Dockerfile -t bookclub-frontend .
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e PORT=6311 \
  -e BACKEND_URL=http://localhost:6310 \
  bookclub-frontend
```

**Access:**
- Backend API: http://localhost:6310
- Frontend: http://localhost:6311

### Important Docker Notes
- ✅ Database persists in the volume across container restarts
- ✅ First run automatically initializes database
- ✅ Both containers run independently
- ✅ Fully configurable via environment variables (PORT, BACKEND_URL)
- ✅ Ready for container orchestrators (Kubernetes, Docker Swarm, etc.)
- ⚠️ Database does NOT auto-reload when you add books

## Common Tasks

### Check Database Status
```bash
node server/init-db.js
# or
curl http://localhost:6310/api/health
```

### Add a New Book (Web Interface)
1. Click **"+ Add Book"** in the navigation
2. Fill out the form (title, description, genres, cover)
3. Press Space after each genre to add it
4. Submit!

### Add a New Book (Legacy)
1. Create folder: `books/my_new_book/`
2. Add `cover.png` and `description.md`
3. Reinitialize: `node server/init-db.js --force`

### View Server Logs (Docker)
```bash
docker logs bookclub-backend
docker logs bookclub-frontend
```

### Backup Database
```bash
cp server/bookclub.db server/bookclub.db.backup
```

## File Structure
```
BookClub/
├── books/              # Book source files
├── server/
│   ├── db.js          # Database logic
│   ├── server.js      # Express server
│   ├── init-db.js     # Manual init script
│   └── bookclub.db    # SQLite database (auto-generated)
└── src/               # React frontend
```

## Need Help?

- **Database issues**: See [INITIALIZATION.md](INITIALIZATION.md)
- **Migration details**: See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Full documentation**: See [README.md](README.md)

## Key Points to Remember

1. ✅ Database initializes ONCE automatically
2. ✅ Add books through web interface (no reinitialize needed!)
3. ✅ Press SPACE to add genres
4. ✅ `books/` folder is now optional (can delete after first init)
5. ✅ Use Docker volumes for data persistence
6. ✅ Both containers fully configurable via environment variables
7. ✅ Development uses separate servers (frontend: 5173, backend: 6310)

