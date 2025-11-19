#!/usr/bin/env node
/**
 * Manual database initialization script
 * 
 * Usage:
 *   node server/init-db.js          - Initialize if empty
 *   node server/init-db.js --force  - Force reinitialize (clears existing data)
 */

import { initializeDatabase, isDatabaseEmpty, getAllBooks } from './db.js';

const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');

console.log('='.repeat(50));
console.log('BookClub Database Initialization');
console.log('='.repeat(50));
console.log();

if (force) {
  console.log('⚠️  FORCE MODE: This will DELETE all existing data!');
  console.log();
}

const isEmpty = isDatabaseEmpty();
console.log(`Database status: ${isEmpty ? 'EMPTY' : 'POPULATED'}`);

if (!isEmpty && !force) {
  const books = getAllBooks();
  console.log(`Database already contains ${books.length} books.`);
  console.log();
  console.log('To reinitialize and replace all data, run:');
  console.log('  node server/init-db.js --force');
  console.log();
  process.exit(0);
}

console.log();
console.log('Initializing database from books/ folder...');
console.log();

const result = initializeDatabase(force);

if (result.success) {
  console.log('✓ Success!');
  console.log(`  ${result.message}`);
  console.log();
  
  const books = getAllBooks();
  console.log('Loaded books:');
  books.forEach((book, index) => {
    console.log(`  ${index + 1}. ${book.title} [${book.genres.join(', ')}]`);
  });
} else {
  console.error('✗ Failed!');
  console.error(`  ${result.message}`);
  process.exit(1);
}

console.log();
console.log('='.repeat(50));
console.log('Database ready!');
console.log('='.repeat(50));

