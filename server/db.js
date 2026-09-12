import Database from 'better-sqlite3'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = join(fileURLToPath(import.meta.url), '..')

const dbPath = process.env.DB_PATH || join(__dirname, 'data', 'wisuda.db')
const dataDir = join(dbPath, '..')

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS graduates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nim TEXT UNIQUE NOT NULL,
    faculty TEXT,
    major TEXT,
    scanned_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    graduate_id TEXT NOT NULL,
    scanner_id TEXT NOT NULL,
    scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (graduate_id) REFERENCES graduates(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scans_graduate ON scans(graduate_id);
  CREATE INDEX IF NOT EXISTS idx_scans_scanner ON scans(scanner_id);
  CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
`)

const cols = db.prepare("PRAGMA table_info(graduates)").all().map(c => c.name)
if (!cols.includes('scanned_at')) {
  db.exec('ALTER TABLE graduates ADD COLUMN scanned_at TEXT')
}

export const getGraduateById = db.prepare('SELECT * FROM graduates WHERE id = ?')
export const getGraduateByNim = db.prepare('SELECT * FROM graduates WHERE nim = ?')
export const getAllGraduates = db.prepare('SELECT * FROM graduates ORDER BY id')
export const insertGraduate = db.prepare('INSERT INTO graduates (id, name, nim, faculty, major) VALUES (?, ?, ?, ?, ?)')
export const updateGraduateScannedAt = db.prepare('UPDATE graduates SET scanned_at = CURRENT_TIMESTAMP WHERE id = ?')

export const insertScan = db.prepare('INSERT INTO scans (graduate_id, scanner_id) VALUES (?, ?)')
export const getScansByScanner = db.prepare('SELECT * FROM scans WHERE scanner_id = ? ORDER BY scanned_at DESC')
export const getRecentScans = db.prepare('SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 100')

export const getStats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM graduates) as total,
    (SELECT COUNT(*) FROM graduates WHERE scanned_at IS NOT NULL) as scanned,
    (SELECT COUNT(*) FROM graduates WHERE scanned_at IS NULL) as pending
`)

export const getStatsByScanner = db.prepare(`
  SELECT scanner_id, COUNT(*) as count
  FROM scans
  GROUP BY scanner_id
`)

export function getDashboardStats() {
  const stats = getStats.get()
  const byScanner = getStatsByScanner.all().reduce((acc, row) => {
    acc[row.scanner_id] = row.count
    return acc
  }, {})
  return { ...stats, byScanner }
}

export default db