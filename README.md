# 📚 BookClub

A beautiful, modern full-stack application with a React + Vite frontend and Express + SQLite backend that manages your book collection.

## Features

- 📖 **SQLite Database**: Books are stored in a lightweight SQLite database (no file system dependency!)
- 📤 **Web Upload**: Add books through a beautiful web interface (no auth required)
- 🚀 **REST API**: Express backend serves book data via clean REST endpoints
- 🎨 **Clean, Sober UI**: Minimalist design with a professional color palette
- 📊 **Three View Modes**: 
  - **List View**: Grid of all books with covers and genres
  - **Graph View**: Interactive visualization of books organized by genres
  - **Upload**: Add new books with drag-and-drop cover upload
- 🏷️ **Smart Genre Input**: Type and press Space to add genres (like tags)
- 🔗 **Genre Connections**: See visual connections between genres when books share multiple genres
- 🔍 **Book Details**: Click any book to see full information including cover, genres, and description
- 🔎 **Zoom & Pan**: Explore the graph view with zoom controls and drag-to-pan
- 🔍 **Live Search**: Real-time search by book title with instant filtering as you type
- 🏷️ **Genre Filtering**: Filter books by one or multiple genres with a single click
- 📱 **Responsive**: Works perfectly on desktop, tablet, and mobile devices
- ⚡ **Fast**: Built with Vite for lightning-fast development and optimized production builds
- 💾 **100% Database**: All data (including images) stored in SQLite - no external files needed

## Project Structure

```
BookClub/
├── books/                    # Source folder for books
│   ├── my_book_1/
│   │   ├── cover.png
│   │   └── description.md
│   ├── my_book_2/
│   │   ├── cover.png
│   │   └── description.md
│   └── ...
├── server/                   # Backend API
│   ├── db.js                # Database setup and queries
│   ├── server.js            # Express server
│   └── bookclub.db          # SQLite database (auto-generated)
├── src/                     # Frontend React app
│   ├── components/
│   │   ├── BookCard.jsx
│   │   └── SearchBar.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── BookDetail.jsx
│   │   └── GraphView.jsx
│   ├── App.jsx
│   └── main.jsx
└── vite.config.js
```

## Adding Books

### Web Interface (Recommended)

1. Click **"+ Add Book"** in the navigation
2. Upload cover image (optional)
3. Enter title (required)
4. Enter description (optional)
5. Add genres by typing and pressing **Space**
6. Click "Add Book"

Done! Book is instantly available.

### Legacy: books/ Folder (Optional)

The `books/` folder is now **optional** and only used for initial database seeding.

Each book should be in its own folder inside `books/` with:

1. **cover.png**: The book cover image
2. **description.md**: A markdown file with frontmatter containing:

```markdown
---
title: Your Book Title
genres:
  - thriller
  - romance
description: A compelling description of your book
---
```

Then run: `node server/init-db.js --force`

## Getting Started

### Installation

```bash
npm install
```

### Development

The application requires both the backend server and frontend dev server to run:

**Option 1: Run both servers concurrently (recommended)**
```bash
npm run dev:full
```

**Option 2: Run separately in different terminals**
```bash
# Terminal 1 - Backend server
npm run server

# Terminal 2 - Frontend dev server
npm run dev
```

- Backend API: [http://localhost:6310](http://localhost:6310)
- Frontend App: [http://localhost:5173](http://localhost:5173)

The frontend automatically proxies API requests to the backend.

### Database Initialization

**First Run:**
On first startup, the server automatically:
1. Creates the SQLite database (`server/bookclub.db`)
2. Reads all books from the `books/` folder
3. Populates the database with book information

**Subsequent Runs:**
The database persists between restarts. The server will NOT reinitialize unless the database is empty.

**Manual Initialization:**
```bash
# Initialize only if database is empty
node server/init-db.js

# Force reinitialize (WARNING: deletes all existing data)
node server/init-db.js --force
```

**During Development:**
To reload books from the `books/` folder after making changes:
```bash
curl -X POST http://localhost:6310/api/reinitialize
```

### Build for Production

```bash
npm run build
```

The static files will be generated in the `dist/` folder. Deploy both the `dist/` folder (frontend) and `server/` folder (backend) to your hosting service.

## Managing Books

### Add New Book (Web Interface)
1. Navigate to http://localhost:5173/upload
2. Fill out the form
3. Submit

The book is instantly added to the database!

### Add New Book (Legacy Method)
1. Create folder in `books/` (e.g., `books/my_book/`)
2. Add `cover.png` and `description.md`
3. Run: `node server/init-db.js --force`

### Can I Delete the books/ Folder?

**Yes!** After initial database setup, you can delete the `books/` folder. The app now relies 100% on SQLite database with web-based uploads.

## Graph View

The Graph View provides an interactive visualization of your book collection:

- **Genre Circles**: Each genre is represented as a circle, sized by the number of books
- **Connection Lines**: Lines automatically connect genre circles when books belong to multiple genres (showing shared content)
- **Interactive**: 
  - Click on a genre circle to view all books in that genre
  - Click on a book to view its details
  - Use zoom controls (+/-) to zoom in/out
  - Click and drag to pan around the graph
- **Back Navigation**: Use the back arrow to return to the full graph view
- **Search Integration**: Search bar filters the entire graph in real-time

## Search Feature

Both List View and Graph View include a powerful search feature:

- **Real-time Filtering**: Results update instantly as you type each letter
- **Title-based Search**: Searches through all book titles
- **Clear Button**: Quick clear button (×) appears when you have text in the search
- **Graph Integration**: In Graph View, the entire graph updates to show only matching books and their genre relationships

## Docker Deployment

The application is containerized and ready to deploy with Docker.

### Quick Start with Docker

**Build and run (fully configurable via ENV):**

```bash
# 1. Build images
docker build -f backend.Dockerfile -t bookclub-backend .
docker build -f frontend.Dockerfile -t bookclub-frontend .

# 2. Run backend
docker volume create bookclub-data
docker run -d \
  --name bookclub-backend \
  -p 6310:6310 \
  -e PORT=6310 \
  -v bookclub-data:/app/server \
  bookclub-backend

# 3. Run frontend
docker run -d \
  --name bookclub-frontend \
  -p 6311:6311 \
  -e PORT=6311 \
  -e BACKEND_URL=http://localhost:6310 \
  bookclub-frontend
```

**Access:**
- Backend API: [http://localhost:6310](http://localhost:6310)
- Frontend: [http://localhost:6311](http://localhost:6311)

**For container orchestrators, see [DOCKER_INDEPENDENT.md](DOCKER_INDEPENDENT.md)**

### Docker Configuration

- **Backend Port**: 6310 (configurable via `PORT` env var)
- **Frontend Port**: 6311 (configurable via `PORT` env var)
- **Backend URL**: Configurable via `BACKEND_URL` env var in frontend
- **Database**: SQLite stored in `/app/server/bookclub.db`
- **Persistence**: Mount `/app/server` as a volume to persist data
- **Architecture**: Two independent containers, orchestrator-ready
- **Auto-initialization**: Database is initialized from `books/` folder on first run

### Docker Commands

```bash
# View logs
docker logs bookclub

# Stop container
docker stop bookclub

# Start container
docker start bookclub

# Remove container
docker rm bookclub

# Remove volume (WARNING: deletes all data)
docker volume rm bookclub-data
```

### Docker Containers

**Backend:**
```bash
docker build -f backend.Dockerfile -t bookclub-backend .
docker run -d \
  -p 6310:6310 \
  -e PORT=6310 \
  -v bookclub-data:/app/server \
  bookclub-backend
```

**Frontend:**
```bash
docker build -f frontend.Dockerfile -t bookclub-frontend .
docker run -d \
  -p 6311:6311 \
  -e PORT=6311 \
  -e BACKEND_URL=http://backend:6310 \
  bookclub-frontend
```

See [DOCKER_INDEPENDENT.md](DOCKER_INDEPENDENT.md) for detailed documentation including:
- Environment variable configuration
- Container orchestrator setup
- Custom ports and URLs
- Production best practices

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/books` - Get all books (supports `?search=query` and `?optimized=true` parameters)
- `GET /api/books/:id` - Get a single book by ID
- `GET /api/genres` - Get all unique genres from the database
- `POST /api/books` - Create a new book (multipart/form-data with cover upload)
- `POST /api/reinitialize` - Force reinitialize database from books folder (legacy)
- `GET /api/health` - Health check endpoint (returns database status and book count)

## Technologies Used

### Backend
- **Express**: Web server framework
- **better-sqlite3**: Fast, synchronous SQLite3 library
- **multer**: File upload middleware for handling images
- **gray-matter**: Parse markdown frontmatter (legacy)
- **CORS**: Enable cross-origin requests

### Frontend
- **React**: UI library
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **CSS3**: Modern styling with CSS variables and animations
- **SVG**: Interactive graph visualization

### Development
- **Concurrently**: Run multiple npm scripts simultaneously
- **Docker**: Containerization for easy deployment

## License

MIT

