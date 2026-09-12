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
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qr_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent_name TEXT,
    quota INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qr_code TEXT NOT NULL,
    name TEXT,
    scanner_id TEXT,
    status TEXT CHECK(status IN ('success','duplicate')),
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qr_code) REFERENCES invitations(qr_code)
  );
`)

const findInvitationStmt = db.prepare('SELECT * FROM invitations WHERE qr_code = ?')
const getAttendanceByQrStmt = db.prepare('SELECT * FROM attendances WHERE qr_code = ? ORDER BY scanned_at DESC LIMIT 1')
const recordAttendanceStmt = db.prepare('INSERT INTO attendances (qr_code, name, scanner_id, status) VALUES (?, ?, ?, ?)')
const getAllAttendancesStmt = db.prepare('SELECT * FROM attendances ORDER BY scanned_at DESC LIMIT ?')
const getStatsStmt = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM invitations) as total,
    (SELECT COUNT(DISTINCT qr_code) FROM attendances WHERE status = 'success') as hadir
`)

export function findInvitation(qrCode) {
  return findInvitationStmt.get(qrCode)
}

export function getAttendanceByQr(qrCode) {
  return getAttendanceByQrStmt.get(qrCode)
}

export function recordAttendance(qrCode, name, scannerId, status) {
  return recordAttendanceStmt.run(qrCode, name, scannerId, status)
}

export function getAllAttendances(limit = 50) {
  return getAllAttendancesStmt.all(limit)
}

export function getStats() {
  const row = getStatsStmt.get()
  return {
    total: row.total,
    hadir: row.hadir,
    belumHadir: row.total - row.hadir
  }
}

export default db