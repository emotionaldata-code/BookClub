import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'bookclub.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cover BLOB
  );

  CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS book_genres (
    book_id TEXT NOT NULL,
    genre_id INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (genre_id) REFERENCES genres(id),
    PRIMARY KEY (book_id, genre_id)
  );

  CREATE INDEX IF NOT EXISTS idx_book_genres_book_id ON book_genres(book_id);
  CREATE INDEX IF NOT EXISTS idx_book_genres_genre_id ON book_genres(genre_id);
  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
`);

// Check if database is empty
export function isDatabaseEmpty() {
  const result = db.prepare('SELECT COUNT(*) as count FROM books').get();
  return result.count === 0;
}

// Function to initialize database with books from books folder
export function initializeDatabase(force = false) {
  const booksDir = path.join(__dirname, '..', 'books');
  
  if (!fs.existsSync(booksDir)) {
    console.log('Books directory not found');
    return { success: false, message: 'Books directory not found' };
  }

  // Only clear existing data if force is true
  if (force) {
    console.log('Force initialization: clearing existing data...');
    db.exec('DELETE FROM book_genres');
    db.exec('DELETE FROM genres');
    db.exec('DELETE FROM books');
  } else if (!isDatabaseEmpty()) {
    console.log('Database already initialized, skipping...');
    return { success: true, message: 'Database already initialized', skipped: true };
  }

  const bookFolders = fs.readdirSync(booksDir);

    const insertBook = db.prepare('INSERT OR REPLACE INTO books (id, title, description, cover) VALUES (?, ?, ?, ?)');
    const insertGenre = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
    const getGenreId = db.prepare('SELECT id FROM genres WHERE name = ?');
    const insertBookGenre = db.prepare('INSERT OR IGNORE INTO book_genres (book_id, genre_id) VALUES (?, ?)');

    const transaction = db.transaction(() => {
        for (const folder of bookFolders) {
            const bookPath = path.join(booksDir, folder);
            const stat = fs.statSync(bookPath);

            if (stat.isDirectory()) {
                const descriptionPath = path.join(bookPath, 'description.md');
                const coverPath = path.join(bookPath, 'cover.png');

                if (fs.existsSync(descriptionPath)) {
                    const descriptionContent = fs.readFileSync(descriptionPath, 'utf-8');
                    const { data } = matter(descriptionContent);

                    // Read cover image as blob
                    let coverData = null;
                    if (fs.existsSync(coverPath)) {
                        coverData = fs.readFileSync(coverPath);
                    }

                    // Insert book
                    insertBook.run(folder, data.title || folder, data.description || '', coverData);

                    // Insert genres and link them to the book
                    if (data.genres && Array.isArray(data.genres)) {
                        for (const genreName of data.genres) {
                            insertGenre.run(genreName);
                            const genre = getGenreId.get(genreName);
                            if (genre) {
                                insertBookGenre.run(folder, genre.id);
                            }
                        }
                    }
                }
            }
        }
    });

  transaction();
  
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get();
  console.log(`Database initialized successfully! Loaded ${bookCount.count} books.`);
  
  return { success: true, message: `Database initialized with ${bookCount.count} books` };
}

// Get all books (full data including cover images)
export function getAllBooks() {
  const books = db.prepare(`
    SELECT id, title, description, cover
    FROM books
    ORDER BY title
  `).all();

  return books.map(book => {
    const genres = db.prepare(`
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = ?
      ORDER BY g.name
    `).all(book.id).map(g => g.name);

    return {
      id: book.id,
      title: book.title,
      description: book.description,
      cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
      genres
    };
  });
}

// Get books list (optimized - without description for faster list queries)
export function getBooksListOptimized() {
  const books = db.prepare(`
    SELECT id, title, cover
    FROM books
    ORDER BY title
  `).all();

  return books.map(book => {
    const genres = db.prepare(`
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = ?
      ORDER BY g.name
    `).all(book.id).map(g => g.name);

    return {
      id: book.id,
      title: book.title,
      cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
      genres
    };
  });
}

// Get all unique genres
export function getAllGenres() {
  return db.prepare(`
    SELECT DISTINCT name
    FROM genres
    ORDER BY name
  `).all().map(g => g.name);
}

// Search books by title
export function searchBooks(query) {
    const books = db.prepare(`
    SELECT id, title, description, cover
    FROM books
    WHERE title LIKE ?
    ORDER BY title
  `).all(`%${query}%`);

    return books.map(book => {
        const genres = db.prepare(`
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = ?
      ORDER BY g.name
    `).all(book.id).map(g => g.name);

        return {
            id: book.id,
            title: book.title,
            description: book.description,
            cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
            genres
        };
    });
}

// Get a single book by ID
export function getBookById(id) {
  const book = db.prepare(`
    SELECT id, title, description, cover
    FROM books
    WHERE id = ?
  `).get(id);

  if (!book) {
    return null;
  }

  const genres = db.prepare(`
    SELECT g.name
    FROM genres g
    INNER JOIN book_genres bg ON g.id = bg.genre_id
    WHERE bg.book_id = ?
    ORDER BY g.name
  `).all(book.id).map(g => g.name);

  return {
    id: book.id,
    title: book.title,
    description: book.description,
    cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
    genres
  };
}

// Create a new book
export function createBook(bookData) {
  const { title, description, cover, genres } = bookData;
  
  // Generate a unique ID from title
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  
  // Check if book already exists
  const existing = db.prepare('SELECT id FROM books WHERE id = ?').get(id);
  if (existing) {
    throw new Error('A book with this title already exists');
  }
  
  const insertBook = db.prepare('INSERT INTO books (id, title, description, cover) VALUES (?, ?, ?, ?)');
  const insertGenre = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
  const getGenreId = db.prepare('SELECT id FROM genres WHERE name = ?');
  const insertBookGenre = db.prepare('INSERT INTO book_genres (book_id, genre_id) VALUES (?, ?)');
  
  const transaction = db.transaction(() => {
    // Insert the book
    insertBook.run(id, title, description || '', cover || null);
    
    // Insert genres and link them
    if (genres && Array.isArray(genres) && genres.length > 0) {
      for (const genreName of genres) {
        if (genreName && genreName.trim()) {
          insertGenre.run(genreName.trim());
          const genre = getGenreId.get(genreName.trim());
          if (genre) {
            insertBookGenre.run(id, genre.id);
          }
        }
      }
    }
  });
  
  transaction();
  
  return getBookById(id);
}

export default db;

