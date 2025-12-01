import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { getAllBooks, searchBooks, getBookById, initializeDatabase, isDatabaseEmpty, createBook, getBooksListOptimized, getAllGenres, deleteBook, getCommentsForBook, addCommentToBook } from './db.js';

dotenv.config();

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

// Get all books or search books
app.get('/api/books', async (req, res) => {
  try {
    const { search, optimized, is_bookclub } = req.query;
    const isBookclubOnly = is_bookclub === 'true' || is_bookclub === '1';
    
    // Use optimized version for list views (excludes description)
    if (optimized === 'true') {
      const books = await getBooksListOptimized({ isBookclubOnly });
      res.json(books);
    } else if (search && search.trim()) {
      const books = await searchBooks(search.trim());
      res.json(books);
    } else {
      const books = await getAllBooks();
      res.json(books);
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get all genres
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await getAllGenres();
    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// Get a single book by ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await getBookById(id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Get comments for a book
app.get('/api/books/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await getCommentsForBook(id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment to a book
app.post('/api/books/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, text } = req.body;

    const newComment = await addCommentToBook(id, { author, text });
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error.message === 'Comment text is required') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete a book by ID
app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteBook(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Create a new book
app.post('/api/books', upload.single('cover'), async (req, res) => {
  try {
    const { title, description, genres, is_bookclub, writer, author, rating } = req.body;
    
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
    // Parse is_bookclub flag (checkbox / string from form-data)
    const isBookclub =
      is_bookclub === 'true' ||
      is_bookclub === '1' ||
      is_bookclub === 'on';

    // Parse rating as 0–5 (with optional halves)
    let numericRating = null;
    if (typeof rating === 'string' && rating.trim() !== '') {
      const parsed = parseFloat(rating);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 5) {
        numericRating = parsed;
      }
    }
    
    // Get cover image buffer if uploaded
    const coverBuffer = req.file ? req.file.buffer : null;
    
    const newBook = await createBook({
      title: title.trim(),
      description: description?.trim() || '',
      cover: coverBuffer,
      genres: genresArray,
      isBookclub,
      writer: writer?.trim() || null,
      author: author?.trim() || null,
      rating: numericRating,
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
app.post('/api/reinitialize', async (req, res) => {
  try {
    const result = await initializeDatabase(true); // Force reinitialize
    res.json({
      message: 'Database reinitialized successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error reinitializing database:', error);
    res.status(500).json({ error: 'Failed to reinitialize database' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const books = await getAllBooks();
    res.json({
      status: 'ok',
      database: 'connected',
      books: books.length,
      isEmpty: await isDatabaseEmpty(),
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
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

async function startServer() {
  try {
    console.log('Checking database status...');
    const initResult = await initializeDatabase(false);
    if (initResult.skipped) {
      const books = await getAllBooks();
      console.log(`Database ready with ${books.length} books.`);
    } else if (initResult.success) {
      console.log('✓ Database initialized for the first time');
    } else {
      console.error('✗ Database initialization failed:', initResult.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      if (isProduction) {
        console.log('Running in PRODUCTION mode (serving frontend + API)');
      } else {
        console.log('Running in DEVELOPMENT mode (API only)');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

