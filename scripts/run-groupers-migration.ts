import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Explicitly load .env.local from the project root FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// THEN import the client factory function
import { createSafeClient } from '../lib/db';

async function main() {
  // Create the SQL client AFTER environment variables are loaded
  const { sql, error: dbClientError, connected } = createSafeClient();

  if (dbClientError || !connected) {
    console.error('Failed to create or connect database client:', dbClientError || 'Not connected');
    process.exit(1);
  }

  try {
    const filePath = path.join(__dirname, 'create-groupers-tables.sql');
    const script = fs.readFileSync(filePath, 'utf8');
    
    console.log('Executing SQL script to create groupers tables...');
    const statements = script.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      // Add back the semicolon if it's not a comment-only line
      const queryToExecute = statement.startsWith('--') ? statement : `${statement};`;
      await sql.query(queryToExecute);
      console.log('Statement executed successfully.');
    }
    console.log('SQL script executed successfully! Tables for groupers should now exist.');
  } catch (error) {
    console.error('Error executing SQL script:', error);
    process.exit(1); // Exit with error code
  }
}

main();
