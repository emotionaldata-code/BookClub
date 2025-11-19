# Database Initialization Guide

## Overview

The BookClub application uses SQLite for persistent storage. The database is automatically created on first run, but **will NOT re-initialize on subsequent runs** to preserve your data.

## Automatic Initialization

### First Run
When you start the server for the first time:
1. The database file `server/bookclub.db` is created
2. Tables are created (books, genres, book_genres)
3. All books from the `books/` folder are read and loaded into the database
4. You'll see: `✓ Database initialized for the first time`

### Subsequent Runs
When you restart the server:
1. The existing database is checked
2. If it contains books, initialization is skipped
3. You'll see: `Database ready with X books.`

This ensures your data persists between restarts!

## Manual Initialization

### Using the Init Script (Recommended)

**Check database status:**
```bash
node server/init-db.js
```

**Force reinitialize (WARNING: deletes all data):**
```bash
node server/init-db.js --force
```

The script will:
- Show current database status
- List all books being loaded
- Confirm successful initialization

### Using the API Endpoint

**During development, you can use:**
```bash
curl -X POST http://localhost:3001/api/reinitialize
```

This forces a complete reload from the `books/` folder.

### Manual Database Reset

**Delete and restart:**
```bash
rm server/bookclub.db
npm run server
```

The database will be recreated from scratch.

## Production Deployment

### Docker

The database is automatically initialized on first container run:

```bash
docker volume create bookclub-data
docker run -d \
  --name bookclub \
  -p 3001:3001 \
  -v bookclub-data:/app/server \
  bookclub
```

**Important**: The volume persists data across container restarts!

### Manual Production Setup

1. **Build the frontend:**
```bash
npm run build
```

2. **Start the server:**
```bash
NODE_ENV=production node server/server.js
```

The database initializes automatically on first run.

## Troubleshooting

### Database is Empty After Restart
**Cause**: Database file was deleted or volume wasn't mounted

**Solution**: 
```bash
node server/init-db.js --force
```

### Books Not Updating
**Cause**: Database doesn't auto-reload from `books/` folder

**Solution**: Force reinitialize
```bash
node server/init-db.js --force
```

### Permission Errors
**Cause**: Server can't write to `server/` directory

**Solution**: Check file permissions
```bash
chmod 755 server/
```

### "Books directory not found"
**Cause**: `books/` folder doesn't exist or is in wrong location

**Solution**: Ensure `books/` folder exists at project root
```bash
ls -la books/
```

## Database Location

- **Development**: `server/bookclub.db` (relative to project root)
- **Docker**: `/app/server/bookclub.db` (mount volume to `/app/server`)

## Health Check

Check database status anytime:
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "database": "connected",
  "books": 14,
  "isEmpty": false
}
```

## Adding Books Workflow

### Development
1. Add book folder to `books/`
2. Run `node server/init-db.js --force`
3. Database is updated with new books

### Production
1. Add book folder to `books/` (on host or rebuild Docker image)
2. Connect to server and run:
   ```bash
   curl -X POST http://localhost:3001/api/reinitialize
   ```
3. Or restart with fresh database:
   ```bash
   docker stop bookclub
   docker rm bookclub
   docker volume rm bookclub-data
   docker volume create bookclub-data
   docker run -d --name bookclub -p 3001:3001 -v bookclub-data:/app/server bookclub
   ```

## Best Practices

1. **Always use volumes in production** - Don't lose your data!
2. **Backup before force reinitialize** - Copy `bookclub.db` first
3. **Use init script for manual updates** - More control than API endpoint
4. **Monitor logs** - Server shows initialization status on startup
5. **Test locally before production** - Use `NODE_ENV=production` locally

## Environment Variables

- `NODE_ENV=production` - Server serves frontend and API together
- `PORT=3001` - Change server port (default: 3001)

## Summary

| Action | Command | Data Loss? |
|--------|---------|------------|
| Start server (first time) | `npm run server` | No - creates DB |
| Start server (subsequent) | `npm run server` | No - uses existing DB |
| Add new book | `node server/init-db.js --force` | Yes - reloads all books |
| Check DB status | `node server/init-db.js` | No |
| Force reload | `curl -X POST .../api/reinitialize` | Yes - reloads all books |
| Delete DB | `rm server/bookclub.db` | Yes - complete reset |

