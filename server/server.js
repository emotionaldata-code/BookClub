import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { createAdminAuth } from './admin-auth.js';
import {
  addCommentToBook,
  createBook,
  createSchema,
  deleteBook,
  getAllBooks,
  getAllGenres,
  getBookById,
  getBooksListOptimized,
  getCommentsForBook,
  isDatabaseEmpty,
  pool,
  searchBooks,
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT || 6310;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);
const adminAuth = createAdminAuth(pool);
app.use('/api/admin', adminAuth.router);

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
      cb(new Error('Sono consentiti solo file immagine.'), false);
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
    res.status(500).json({ error: 'Impossibile caricare i libri.' });
  }
});

// Get all genres
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await getAllGenres();
    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Impossibile caricare i generi.' });
  }
});

// Get a single book by ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await getBookById(id);
    
    if (!book) {
      return res.status(404).json({ error: 'Libro non trovato.' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Impossibile caricare il libro.' });
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
    res.status(500).json({ error: 'Impossibile caricare i commenti.' });
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
    if (error.message === 'Il testo del commento è obbligatorio.') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Impossibile pubblicare il commento.' });
  }
});

// Delete a book by ID
app.delete('/api/books/:id', adminAuth.requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteBook(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Libro non trovato.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Impossibile eliminare il libro.' });
  }
});

// Create a new book
app.post('/api/books', upload.single('cover'), async (req, res) => {
  try {
    const { title, description, genres, is_bookclub, writer, author, rating } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Il titolo è obbligatorio.' });
    }
    
    // Parse genres (sent as JSON string or array)
    let genresArray = [];
    if (genres) {
      try {
        genresArray = typeof genres === 'string' ? JSON.parse(genres) : genres;
      } catch (e) {
        return res.status(400).json({ error: 'Formato dei generi non valido.' });
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
    if (error.message === 'Esiste già un libro con questo titolo.') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Impossibile aggiungere il libro.' });
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
    res.status(500).json({ error: 'Controllo dello stato del servizio non riuscito.' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato.' });
});

app.use((error, req, res, next) => {
  if (!req.path.startsWith('/api/')) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Formato JSON non valido.' });
  }
  if (error instanceof multer.MulterError || error.message === 'Sono consentiti solo file immagine.') {
    return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'La copertina non può superare 5 MB.' : 'Carica un solo file immagine valido per la copertina.' });
  }
  console.error('Errore API:', error);
  return res.status(500).json({ error: 'Errore del servizio. Riprova.' });
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
    await createSchema();
    await adminAuth.initialize();
    const books = await getAllBooks();
    console.log(`Database ready with ${books.length} books.`);

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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
