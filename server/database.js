import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const databasePath = path.resolve(
  process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'everafter.sqlite'),
)

mkdirSync(path.dirname(databasePath), { recursive: true })

const database = new Database(databasePath)
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')
database.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

export default database