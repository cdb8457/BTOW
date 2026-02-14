import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection
const connectionString = process.env.DATABASE_URL || 'postgresql://btow:devpassword@localhost:5432/btow';
const client = postgres(connectionString);

// Create the db instance
export const db = drizzle(client, { schema });

export default db;