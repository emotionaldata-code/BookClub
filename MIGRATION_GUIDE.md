# Migration Guide: SQLite Database Architecture

## Overview

Your BookClub application has been migrated from a Vite plugin-based static architecture to a full-stack architecture with:
- **Backend**: Express server with SQLite database
- **Frontend**: React app that fetches data from REST API
- **Improved Search**: Refactored SearchBar with better null handling

## What Changed

### 1. Backend Infrastructure (NEW)

#### Created Files:
- `server/db.js` - Database setup, initialization, and query functions
- `server/server.js` - Express API server with REST endpoints

#### Database Schema:
```sql
books (id, title, description, cover)
genres (id, name)
book_genres (book_id, genre_id) -- junction table
```

### 2. Frontend Updates

#### Updated Files:
- `src/pages/Home.jsx` - Now fetches books from API with loading/error states
- `src/pages/BookDetail.jsx` - Fetches individual book from API
- `src/pages/GraphView.jsx` - Fetches books from API for graph visualization
- `src/components/SearchBar.jsx` - Improved null handling and UX

#### Key Changes:
- Removed `import { books } from 'virtual:books'`
- Added `useEffect` hooks to fetch data from API
- Added loading and error states
- Improved search filtering with proper `.trim()` handling

### 3. Configuration Updates

#### `package.json`:
- Added dependencies: `better-sqlite3`, `cors`, `express`, `concurrently`
- Added scripts:
  - `npm run server` - Start backend server
  - `npm run dev:full` - Run both servers concurrently

#### `vite.config.js`:
- Removed custom `booksPlugin()`
- Added API proxy configuration for `/api` routes

#### `.gitignore`:
- Added `server/bookclub.db` and related SQLite files

## API Endpoints

The backend provides these REST endpoints:

1. `GET /api/books` - Get all books
2. `GET /api/books?search=query` - Search books by title
3. `GET /api/books/:id` - Get single book by ID
4. `POST /api/reinitialize` - Reinitialize database from books folder

## How to Run

### First Time Setup

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
npm run dev:full
```

This will:
- Start the Express backend on `http://localhost:3001`
- Start the Vite dev server on `http://localhost:5173`
- Automatically initialize the SQLite database with books from the `books/` folder (ONLY if database is empty)

### Database Initialization Behavior

**IMPORTANT**: The database only initializes ONCE on first run.

- **First run**: Database is created and populated from `books/` folder
- **Subsequent runs**: Existing database is preserved (no re-initialization)
- **Manual refresh**: Use `node server/init-db.js --force` or `POST /api/reinitialize`

### Development Workflow

**Run both servers concurrently (recommended):**
```bash
npm run dev:full
```

**Or run separately:**
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

### Adding New Books

**IMPORTANT**: The database does NOT automatically update when you add books to the `books/` folder.

You must manually reinitialize:

**Option 1: Using the init script**
```bash
node server/init-db.js --force
```

**Option 2: Using the API**
```bash
curl -X POST http://localhost:3001/api/reinitialize
```

**Option 3: Delete the database and restart**
```bash
rm server/bookclub.db
npm run server  # Will reinitialize automatically
```

## Benefits of This Architecture

### 1. **Persistent Storage**
- Books stored in SQLite database
- No need to rebuild frontend when adding books
- Fast database queries

### 2. **Better Search**
- Server-side search capability (currently client-side filtering is still used)
- Database indexes for performance
- Potential for fuzzy search, full-text search in future

### 3. **Scalability**
- Easy to add CRUD operations (Create, Update, Delete books)
- Can add authentication, user favorites, ratings, etc.
- Separation of concerns (frontend/backend)

### 4. **Development Experience**
- Hot reload for frontend changes (Vite)
- Easy backend debugging
- RESTful API design

## Troubleshooting

### "Cannot find module 'better-sqlite3'"
Run: `npm install`

### "Port 3001 already in use"
Kill the process using port 3001 or change the PORT in `server/server.js`

### Database is empty
- Check that `books/` folder has proper structure
- Restart the server to reinitialize
- Check server console for errors

### API requests failing
- Ensure backend server is running (`npm run server`)
- Check that Vite proxy is configured correctly in `vite.config.js`
- Open browser DevTools > Network tab to see API calls

## Future Enhancements

Possible next steps:
- Add book CRUD operations (Add, Edit, Delete via UI)
- Implement server-side search with full-text search
- Add pagination for large collections
- Add book ratings and reviews
- Implement user authentication
- Add book recommendations based on genres
- Export/import book collections

