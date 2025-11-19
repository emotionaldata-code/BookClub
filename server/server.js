import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getAllBooks, searchBooks, getBookById, initializeDatabase, isDatabaseEmpty, createBook, getBooksListOptimized, getAllGenres } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6310;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize database on startup (only if empty)
console.log('Checking database status...');
const initResult = initializeDatabase(false);
if (initResult.skipped) {
    const booksCount = getAllBooks().length;
    console.log(`Database ready with ${booksCount} books.`);
} else if (initResult.success) {
    console.log('✓ Database initialized for the first time');
} else {
    console.error('✗ Database initialization failed:', initResult.message);
}

// Get all books or search books
app.get('/api/books', (req, res) => {
  try {
    const { search, optimized } = req.query;
    
    // Use optimized version for list views (excludes description)
    if (optimized === 'true') {
      const books = getBooksListOptimized();
      res.json(books);
    } else if (search && search.trim()) {
      const books = searchBooks(search.trim());
      res.json(books);
    } else {
      const books = getAllBooks();
      res.json(books);
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get all genres
app.get('/api/genres', (req, res) => {
  try {
    const genres = getAllGenres();
    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// Get a single book by ID
app.get('/api/books/:id', (req, res) => {
  try {
    const { id } = req.params;
    const book = getBookById(id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Create a new book
app.post('/api/books', upload.single('cover'), (req, res) => {
  try {
    const { title, description, genres } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Parse genres (sent as JSON string or array)
    let genresArray = [];
    if (genres) {
      try {
        genresArray = typeof genres === 'string' ? JSON.parse(genres) : genres;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid genres format' });
      }
    }
    
    // Get cover image buffer if uploaded
    const coverBuffer = req.file ? req.file.buffer : null;
    
    const newBook = createBook({
      title: title.trim(),
      description: description?.trim() || '',
      cover: coverBuffer,
      genres: genresArray
    });
    
    res.status(201).json(newBook);
  } catch (error) {
    console.error('Error creating book:', error);
    if (error.message === 'A book with this title already exists') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// Reinitialize database (useful for development - force reload from books folder)
app.post('/api/reinitialize', (req, res) => {
    try {
        const result = initializeDatabase(true); // Force reinitialize
        res.json({
            message: 'Database reinitialized successfully',
            ...result
        });
    } catch (error) {
        console.error('Error reinitializing database:', error);
        res.status(500).json({ error: 'Failed to reinitialize database' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const booksCount = getAllBooks().length;
    res.json({
        status: 'ok',
        database: 'connected',
        books: booksCount,
        isEmpty: isDatabaseEmpty()
    });
});

// In production, serve the built frontend
if (isProduction) {
    const distPath = path.join(__dirname, '..', 'dist');

    // Serve static files from the dist directory
    app.use(express.static(distPath));

    // Handle client-side routing - send all non-API requests to index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });

    console.log(`Serving frontend from ${distPath}`);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (isProduction) {
        console.log('Running in PRODUCTION mode (serving frontend + API)');
    } else {
        console.log('Running in DEVELOPMENT mode (API only)');
    }
});

