import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: process.env.DB_FILE || './onboarding_v2.sqlite',
      driver: sqlite3.Database,
    });
    await db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}
