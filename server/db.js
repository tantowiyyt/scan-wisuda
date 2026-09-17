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
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    event_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    family_group TEXT NOT NULL,
    qr_code TEXT NOT NULL,
    name TEXT NOT NULL,
    prodi TEXT,
    jenjang TEXT,
    kategori TEXT NOT NULL CHECK(kategori IN ('mahasiswa', 'ayah', 'ibu', 'wali')),
    quota INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, qr_code),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_family_group ON invitations(event_id, family_group);

  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    qr_code TEXT NOT NULL,
    name TEXT,
    scanner_id TEXT,
    status TEXT CHECK(status IN ('success','duplicate')),
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );
`)

const findInvitationStmt = db.prepare('SELECT * FROM invitations WHERE event_id = ? AND qr_code = ?')
const getAttendanceByQrStmt = db.prepare('SELECT * FROM attendances WHERE event_id = ? AND qr_code = ? ORDER BY scanned_at DESC LIMIT 1')
const recordAttendanceStmt = db.prepare('INSERT INTO attendances (event_id, qr_code, name, scanner_id, status) VALUES (?, ?, ?, ?, ?)')
const getAllAttendancesStmt = db.prepare(`
  SELECT a.id, a.event_id, a.qr_code, a.name, a.scanner_id, a.status, a.scanned_at
  FROM attendances a
  WHERE a.event_id = ? AND a.status = 'success'
  ORDER BY a.scanned_at DESC
  LIMIT ?
`)
const getStatsStmt = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM invitations WHERE event_id = ?) as total,
    (SELECT COUNT(DISTINCT qr_code) FROM attendances WHERE event_id = ? AND status = 'success') as hadir
`)

const getAllInvitationsWithStatusStmt = db.prepare(`
  SELECT 
    i.id,
    i.event_id,
    i.family_group,
    i.qr_code,
    i.name,
    i.prodi,
    i.jenjang,
    i.kategori,
    i.quota,
    i.created_at,
    CASE 
      WHEN a.id IS NOT NULL AND a.status = 'success' THEN 'hadir'
      WHEN a.id IS NOT NULL AND a.status = 'duplicate' THEN 'duplicate'
      ELSE 'belum'
    END AS status,
    a.scanned_at
  FROM invitations i
  LEFT JOIN attendances a ON a.event_id = i.event_id AND a.qr_code = i.qr_code AND a.status = 'success'
  WHERE i.event_id = ?
  ORDER BY i.family_group ASC, i.kategori ASC
`)

const getAllEventsStmt = db.prepare('SELECT * FROM events ORDER BY year DESC, id DESC')
const getEventByIdStmt = db.prepare('SELECT * FROM events WHERE id = ?')
const createEventStmt = db.prepare('INSERT INTO events (name, year, event_date) VALUES (?, ?, ?)')
const updateEventStmt = db.prepare('UPDATE events SET name = ?, year = ?, event_date = ? WHERE id = ?')
const deleteEventStmt = db.prepare('DELETE FROM events WHERE id = ?')
const createInvitationStmt = db.prepare('INSERT OR IGNORE INTO invitations (event_id, family_group, qr_code, name, prodi, jenjang, kategori, quota) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
const countInvitationsByEventStmt = db.prepare('SELECT COUNT(*) as count FROM invitations WHERE event_id = ?')

const getInvitationsForQRCodesStmt = db.prepare(`
  SELECT family_group, qr_code, name, prodi, jenjang, kategori
  FROM invitations 
  WHERE event_id = ? AND (? IS NULL OR kategori = ?)
  ORDER BY family_group ASC, kategori ASC
`)

const getFamiliesWithStatusStmt = db.prepare(`
  SELECT 
    i.family_group,
    i.qr_code,
    i.name,
    i.prodi,
    i.jenjang,
    i.kategori,
    CASE 
      WHEN a.id IS NOT NULL AND a.status = 'success' THEN 'hadir'
      WHEN a.id IS NOT NULL AND a.status = 'duplicate' THEN 'duplicate'
      ELSE 'belum'
    END AS status,
    a.scanned_at
  FROM invitations i
  LEFT JOIN attendances a ON a.event_id = i.event_id AND a.qr_code = i.qr_code AND a.status = 'success'
  WHERE i.event_id = ?
  ORDER BY i.family_group ASC, i.kategori ASC
`)

export function findInvitation(eventId, qrCode) {
  return findInvitationStmt.get(eventId, qrCode)
}

export function getAttendanceByQr(eventId, qrCode) {
  return getAttendanceByQrStmt.get(eventId, qrCode)
}

export function recordAttendance(eventId, qrCode, name, scannerId, status) {
  return recordAttendanceStmt.run(eventId, qrCode, name, scannerId, status)
}

export function getAllAttendances(eventId, limit = 50) {
  return getAllAttendancesStmt.all(eventId, limit)
}

export function getStats(eventId) {
  const row = getStatsStmt.get(eventId, eventId)
  return {
    total: row.total,
    hadir: row.hadir,
    belumHadir: row.total - row.hadir
  }
}

export function getAllInvitationsWithStatus(eventId) {
  return getAllInvitationsWithStatusStmt.all(eventId)
}

export function getAllEvents() {
  return getAllEventsStmt.all()
}

export function getEventById(id) {
  return getEventByIdStmt.get(id)
}

export function createEvent(name, year, eventDate) {
  return createEventStmt.run(name, year, eventDate)
}

export function updateEvent(id, name, year, eventDate) {
  return updateEventStmt.run(name, year, eventDate, id)
}

export function deleteEvent(id) {
  return deleteEventStmt.run(id)
}

export function createInvitation(eventId, familyGroup, qrCode, name, prodi, jenjang, kategori) {
  return createInvitationStmt.run(eventId, familyGroup, qrCode, name, prodi || null, jenjang || null, kategori, 1)
}

export function countInvitationsByEvent(eventId) {
  return countInvitationsByEventStmt.get(eventId).count
}

export function getInvitationsForQRCodes(eventId, filterKategori = null) {
  return getInvitationsForQRCodesStmt.all(eventId, filterKategori, filterKategori)
}

export function getFamiliesWithStatus(eventId) {
  const rows = getFamiliesWithStatusStmt.all(eventId)
  const families = {}
  
  for (const row of rows) {
    if (!families[row.family_group]) {
      families[row.family_group] = {
        family_group: row.family_group,
        mahasiswa: null,
        ayah: null,
        ibu: null,
        wali: null,
        hadir_count: 0,
        total_count: 0
      }
    }
    
    const member = {
      qr_code: row.qr_code,
      name: row.name,
      prodi: row.prodi,
      jenjang: row.jenjang,
      status: row.status,
      scanned_at: row.scanned_at
    }
    
    families[row.family_group][row.kategori] = member
    families[row.family_group].total_count++
    if (row.status === 'hadir') {
      families[row.family_group].hadir_count++
    }
  }
  
  return Object.values(families)
}

export default db