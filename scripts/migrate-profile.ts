import dotenv from 'dotenv';
import { RowDataPacket } from 'mysql2/promise';
import { closeDatabase, getDatabase } from '../server/database';

dotenv.config({ path: ['.env.local', '.env'] });

const PROFILE_COLUMNS = [
  ['avatar_data', 'MEDIUMTEXT NULL'],
  ['gstin', 'VARCHAR(32) NULL'],
  ['trade_category', 'VARCHAR(120) NULL'],
  ['csc_kiosk_id', 'VARCHAR(64) NULL'],
  ['gov_cadre', 'VARCHAR(120) NULL'],
] as const;

async function migrateProfileColumns(): Promise<void> {
  const database = getDatabase();
  for (const [column, definition] of PROFILE_COLUMNS) {
    const [rows] = await database.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [column],
    );
    if (rows.length) {
      console.log(`Profile column ${column} already exists.`);
      continue;
    }
    await database.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
    console.log(`Added profile column ${column}.`);
  }
}

try {
  await migrateProfileColumns();
  console.log('Profile schema migration completed. Existing rows were preserved.');
} catch (error) {
  console.error('Profile schema migration failed:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
