import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn('POSTGRES_URL is not set. Database operations will fail until it is configured.');
}

export const pool = new Pool({
  connectionString,
});

// Helper to create tables/schema
export async function createSchema(clientOrPool = pool) {
  const executor = 'query' in clientOrPool ? clientOrPool : pool;

  await executor.query(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cover BYTEA,
      is_bookclub BOOLEAN NOT NULL DEFAULT FALSE,
      writer TEXT,
      author TEXT,
      rating NUMERIC(2,1)
    );

    -- Ensure new columns exist even if table was created previously
    ALTER TABLE books
      ADD COLUMN IF NOT EXISTS is_bookclub BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE books
      ADD COLUMN IF NOT EXISTS writer TEXT;

    ALTER TABLE books
      ADD COLUMN IF NOT EXISTS author TEXT;

    ALTER TABLE books
      ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      author TEXT,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comments_book_id ON comments(book_id);
    CREATE INDEX IF NOT EXISTS idx_comments_book_created_at ON comments(book_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS genres (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS book_genres (
      book_id TEXT NOT NULL,
      genre_id INTEGER NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, genre_id)
    );

    CREATE INDEX IF NOT EXISTS idx_book_genres_book_id ON book_genres(book_id);
    CREATE INDEX IF NOT EXISTS idx_book_genres_genre_id ON book_genres(genre_id);
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  `);
}

// Check if database is empty
export async function isDatabaseEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM books');
  return Number(rows[0].count) === 0;
}

// Function to initialize database with books from books folder
export async function initializeDatabase(force = false) {
  const booksDir = path.join(__dirname, '..', 'books');

  if (!fs.existsSync(booksDir)) {
    console.log('Books directory not found');
    return { success: false, message: 'Books directory not found' };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure schema exists
    await createSchema(client);

    // Only clear existing data if force is true
    if (force) {
      console.log('Force initialization: clearing existing data...');
      await client.query('TRUNCATE TABLE book_genres, genres, books RESTART IDENTITY');
    } else {
      const { rows } = await client.query('SELECT COUNT(*) AS count FROM books');
      if (Number(rows[0].count) > 0) {
        console.log('Database already initialized, skipping...');
        await client.query('COMMIT');
        return { success: true, message: 'Database already initialized', skipped: true };
      }
    }

    const bookFolders = fs.readdirSync(booksDir);

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

          // Insert or update book
          await client.query(
            `
            INSERT INTO books (id, title, description, cover, is_bookclub, writer, author, rating)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              cover = EXCLUDED.cover,
              is_bookclub = EXCLUDED.is_bookclub,
              writer = EXCLUDED.writer,
              author = EXCLUDED.author,
              rating = EXCLUDED.rating
          `,
            [
              folder,
              data.title || folder,
              data.description || '',
              coverData,
              data.is_bookclub === true,
              data.writer || null,
              data.author || null,
              typeof data.rating === 'number' ? data.rating : null
            ]
          );

          // Insert genres and link them to the book
          if (data.genres && Array.isArray(data.genres)) {
            for (const genreName of data.genres) {
              if (!genreName || !genreName.trim()) continue;
              const genreTrimmed = genreName.trim();

              await client.query(
                `
                INSERT INTO genres (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
              `,
                [genreTrimmed]
              );

              const { rows: genreRows } = await client.query(
                'SELECT id FROM genres WHERE name = $1',
                [genreTrimmed]
              );

              if (genreRows[0]) {
                await client.query(
                  `
                  INSERT INTO book_genres (book_id, genre_id)
                  VALUES ($1, $2)
                  ON CONFLICT (book_id, genre_id) DO NOTHING
                `,
                  [folder, genreRows[0].id]
                );
              }
            }
          }
        }
      }
    }

    const { rows: bookCountRows } = await client.query(
      'SELECT COUNT(*) AS count FROM books'
    );
    await client.query('COMMIT');

    const count = Number(bookCountRows[0].count);
    console.log(`Database initialized successfully! Loaded ${count} books.`);

    return { success: true, message: `Database initialized with ${count} books` };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    return { success: false, message: error.message };
  } finally {
    client.release();
  }
}

// Get all books (full data including cover images)
export async function getAllBooks() {
  const { rows: books } = await pool.query(
    `
      SELECT id, title, description, cover, is_bookclub, writer, author, rating
      FROM books
      ORDER BY title
    `
  );

  const result = [];

  for (const book of books) {
    const { rows: genreRows } = await pool.query(
      `
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = $1
      ORDER BY g.name
    `,
      [book.id]
    );

    const genres = genreRows.map((g) => g.name);

    result.push({
      id: book.id,
      title: book.title,
      description: book.description,
      cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
      is_bookclub: book.is_bookclub,
      writer: book.writer,
      author: book.author,
      rating: book.rating != null ? Number(book.rating) : null,
      genres,
    });
  }

  return result;
}

// Get books list (optimized - without description for faster list queries)
export async function getBooksListOptimized({ isBookclubOnly = false } = {}) {
  const { rows: books } = await pool.query(
    `
      SELECT id, title, cover, is_bookclub, writer, author, rating
      FROM books
      ${isBookclubOnly ? 'WHERE is_bookclub = TRUE' : ''}
      ORDER BY title
    `
  );

  const result = [];

  for (const book of books) {
    const { rows: genreRows } = await pool.query(
      `
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = $1
      ORDER BY g.name
    `,
      [book.id]
    );

    const genres = genreRows.map((g) => g.name);

    result.push({
      id: book.id,
      title: book.title,
      cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
      is_bookclub: book.is_bookclub,
      writer: book.writer,
      author: book.author,
      rating: book.rating != null ? Number(book.rating) : null,
      genres,
    });
  }

  return result;
}

// Get all unique genres
export async function getAllGenres() {
  const { rows } = await pool.query(
    `
      SELECT DISTINCT name
      FROM genres
      ORDER BY name
    `
  );

  return rows.map((g) => g.name);
}

// Search books by title
export async function searchBooks(query) {
  const { rows: books } = await pool.query(
    `
      SELECT id, title, description, cover, is_bookclub, writer, author, rating
      FROM books
      WHERE title ILIKE $1
      ORDER BY title
    `,
    [`%${query}%`]
  );

  const result = [];

  for (const book of books) {
    const { rows: genreRows } = await pool.query(
      `
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = $1
      ORDER BY g.name
    `,
      [book.id]
    );

    const genres = genreRows.map((g) => g.name);

    result.push({
      id: book.id,
      title: book.title,
      description: book.description,
      cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
      is_bookclub: book.is_bookclub,
      writer: book.writer,
      author: book.author,
      rating: book.rating != null ? Number(book.rating) : null,
      genres,
    });
  }

  return result;
}

// Get a single book by ID
export async function getBookById(id) {
  const { rows } = await pool.query(
    `
      SELECT id, title, description, cover, is_bookclub, writer, author, rating
      FROM books
      WHERE id = $1
    `,
    [id]
  );

  const book = rows[0];

  if (!book) {
    return null;
  }

  const { rows: genreRows } = await pool.query(
    `
      SELECT g.name
      FROM genres g
      INNER JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = $1
      ORDER BY g.name
    `,
    [book.id]
  );

  const genres = genreRows.map((g) => g.name);

  return {
    id: book.id,
    title: book.title,
    description: book.description,
    cover: book.cover ? `data:image/png;base64,${book.cover.toString('base64')}` : null,
    is_bookclub: book.is_bookclub,
    writer: book.writer,
    author: book.author,
    rating: book.rating != null ? Number(book.rating) : null,
    genres,
  };
}

// Create a new book
export async function createBook(bookData) {
  const { title, description, cover, genres, isBookclub = false, writer = null, author = null, rating = null } = bookData;

  // Generate a unique ID from title
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
        INSERT INTO books (id, title, description, cover, is_bookclub, writer, author, rating)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        id,
        title,
        description || '',
        cover || null,
        isBookclub,
        writer || null,
        author || null,
        typeof rating === 'number' ? rating : null,
      ]
    );

    if (genres && Array.isArray(genres) && genres.length > 0) {
      for (const genreName of genres) {
        if (!genreName || !genreName.trim()) continue;
        const genreTrimmed = genreName.trim();

        await client.query(
          `
            INSERT INTO genres (name)
            VALUES ($1)
            ON CONFLICT (name) DO NOTHING
          `,
          [genreTrimmed]
        );

        const { rows: genreRows } = await client.query(
          'SELECT id FROM genres WHERE name = $1',
          [genreTrimmed]
        );

        if (genreRows[0]) {
          await client.query(
            `
              INSERT INTO book_genres (book_id, genre_id)
              VALUES ($1, $2)
              ON CONFLICT (book_id, genre_id) DO NOTHING
            `,
            [id, genreRows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT');

    return await getBookById(id);
  } catch (error) {
    await client.query('ROLLBACK');

    // 23505: unique_violation
    if (error.code === '23505') {
      throw new Error('A book with this title already exists');
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function deleteBook(id) {
  const { rowCount } = await pool.query(
    `
      DELETE FROM books
      WHERE id = $1
    `,
    [id]
  );

  return rowCount > 0;
}

export async function getCommentsForBook(bookId) {
  const { rows } = await pool.query(
    `
      SELECT id, author, text, created_at
      FROM comments
      WHERE book_id = $1
      ORDER BY created_at DESC
    `,
    [bookId]
  );

  return rows.map((row) => ({
    id: row.id,
    author: row.author,
    text: row.text,
    created_at: row.created_at,
  }));
}

export async function addCommentToBook(bookId, { author, text }) {
  if (!text || !text.trim()) {
    throw new Error('Comment text is required');
  }

  const { rows } = await pool.query(
    `
      INSERT INTO comments (book_id, author, text)
      VALUES ($1, $2, $3)
      RETURNING id, author, text, created_at
    `,
    [bookId, author && author.trim() ? author.trim() : null, text.trim()]
  );

  const row = rows[0];
  return {
    id: row.id,
    author: row.author,
    text: row.text,
    created_at: row.created_at,
  };
}

export default pool;

