import dotenv from 'dotenv';
import pkg from 'pg';
import { createSchema } from './db.js';

dotenv.config();
const { Pool } = pkg;

async function main() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('POSTGRES_URL is not set. Please configure it in your environment or .env file.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('Creating Postgres schema...');
    await createSchema(pool);
    console.log('✓ Schema created or already up to date.');
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();


