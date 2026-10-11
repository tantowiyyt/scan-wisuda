import Database from 'better-sqlite3'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = join(fileURLToPath(import.meta.url), '..')

// DB_PATH relatif di-resolve dari folder server/ agar dev, npm start, seed,
// dan systemd selalu memakai file database yang sama
const dbPath = process.env.DB_PATH
  ? resolve(__dirname, process.env.DB_PATH)
  : join(__dirname, 'data', 'wisuda.db')
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
    nim TEXT,
    kelas TEXT,
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
    -- success = masuk pertama; duplicate = masuk kembali (mis. habis ke WC), bukan pelanggaran
    status TEXT CHECK(status IN ('success','duplicate')),
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  -- Scan QR tidak valid, untuk statistik & pemantauan perangkat di dashboard
  CREATE TABLE IF NOT EXISTS scan_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    qr_code TEXT,
    scanner_id TEXT,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );
`)

// Migrasi: client_scan_id = ID unik scan dari perangkat, agar scan offline yang
// terkirim ulang (mis. koneksi putus saat sinkron) tidak tercatat dua kali
for (const table of ['attendances', 'scan_errors']) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
  if (!cols.includes('client_scan_id')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN client_scan_id TEXT`)
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_client_scan ON ${table}(client_scan_id) WHERE client_scan_id IS NOT NULL`)
}

const findInvitationStmt = db.prepare('SELECT * FROM invitations WHERE event_id = ? AND qr_code = ?')
const insertScanStmt = db.prepare(`
  INSERT INTO attendances (event_id, qr_code, name, scanner_id, status, scanned_at, client_scan_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)
const getSuccessByQrStmt = db.prepare(`SELECT * FROM attendances WHERE event_id = ? AND qr_code = ? AND status = 'success' ORDER BY id LIMIT 1`)
const demoteToDuplicateStmt = db.prepare(`UPDATE attendances SET status = 'duplicate' WHERE id = ?`)
const getPreviousScanStmt = db.prepare(`
  SELECT * FROM attendances
  WHERE event_id = ? AND qr_code = ? AND id != ? AND scanned_at <= ?
  ORDER BY scanned_at DESC, id DESC LIMIT 1
`)
const findAttendanceByClientIdStmt = db.prepare('SELECT * FROM attendances WHERE client_scan_id = ?')
const findScanErrorByClientIdStmt = db.prepare('SELECT * FROM scan_errors WHERE client_scan_id = ?')
// Kehadiran + info undangan; data mahasiswa diambil dari anggota keluarga
// kategori 'mahasiswa' agar scan orang tua juga tahu "orang tua dari siapa"
const getAllAttendancesStmt = db.prepare(`
  SELECT a.id, a.event_id, a.qr_code, a.name, a.scanner_id, a.status,
    strftime('%Y-%m-%dT%H:%M:%SZ', a.scanned_at) AS scanned_at,
    i.kategori, i.family_group,
    m.name AS mahasiswa_name, m.nim, m.kelas, m.prodi, m.jenjang
  FROM attendances a
  LEFT JOIN invitations i ON i.event_id = a.event_id AND i.qr_code = a.qr_code
  LEFT JOIN invitations m ON m.event_id = a.event_id AND m.family_group = i.family_group AND m.kategori = 'mahasiswa'
  WHERE a.event_id = ? AND a.status = 'success'
  ORDER BY a.scanned_at DESC, a.id DESC
  LIMIT ?
`)
const getFamilyMembersStmt = db.prepare(`
  SELECT i.kategori, i.name, i.qr_code, i.prodi, i.jenjang, i.nim, i.kelas,
    (SELECT strftime('%Y-%m-%dT%H:%M:%SZ', MIN(a.scanned_at)) FROM attendances a
      WHERE a.event_id = i.event_id AND a.qr_code = i.qr_code AND a.status = 'success') AS scanned_at
  FROM invitations i
  WHERE i.event_id = ? AND i.family_group = ?
  ORDER BY CASE i.kategori WHEN 'mahasiswa' THEN 0 WHEN 'ayah' THEN 1 WHEN 'ibu' THEN 2 ELSE 3 END
`)
// Riwayat scan satu undangan: berapa kali di-scan & perangkat masuk pertama
const getScanHistoryStmt = db.prepare(`
  SELECT COUNT(*) AS scan_count,
    (SELECT scanner_id FROM attendances
      WHERE event_id = ? AND qr_code = ? AND status = 'success' ORDER BY id LIMIT 1) AS first_scanner_id
  FROM attendances WHERE event_id = ? AND qr_code = ?
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
    i.nim,
    i.kelas,
    i.kategori,
    i.quota,
    i.created_at,
    CASE 
      WHEN a.id IS NOT NULL AND a.status = 'success' THEN 'hadir'
      WHEN a.id IS NOT NULL AND a.status = 'duplicate' THEN 'duplicate'
      ELSE 'belum'
    END AS status,
    strftime('%Y-%m-%dT%H:%M:%SZ', a.scanned_at) AS scanned_at
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
const createInvitationStmt = db.prepare('INSERT OR IGNORE INTO invitations (event_id, family_group, qr_code, name, prodi, jenjang, nim, kelas, kategori, quota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
const deleteAttendancesByEventStmt = db.prepare('DELETE FROM attendances WHERE event_id = ?')
const deleteScanErrorsByEventStmt = db.prepare('DELETE FROM scan_errors WHERE event_id = ?')
const recordScanErrorStmt = db.prepare('INSERT INTO scan_errors (event_id, qr_code, scanner_id, scanned_at, client_scan_id) VALUES (?, ?, ?, ?, ?)')

// Daftar event + ringkasan keluarga terdaftar & hadir (untuk kartu Pilih Event)
const getEventsWithStatsStmt = db.prepare(`
  SELECT e.*,
    (SELECT COUNT(DISTINCT family_group) FROM invitations WHERE event_id = e.id) AS total_keluarga,
    (SELECT COUNT(DISTINCT i.family_group) FROM invitations i
      JOIN attendances a ON a.event_id = i.event_id AND a.qr_code = i.qr_code AND a.status = 'success'
      WHERE i.event_id = e.id AND i.kategori = 'mahasiswa') AS hadir_keluarga
  FROM events e
  ORDER BY e.year DESC, e.id DESC
`)

// --- Query dashboard admin ---
const dashKategoriStmt = db.prepare(`
  SELECT i.kategori, COUNT(*) AS total, COUNT(h.qr_code) AS hadir
  FROM invitations i
  LEFT JOIN (SELECT DISTINCT qr_code FROM attendances WHERE event_id = ? AND status = 'success') h
    ON h.qr_code = i.qr_code
  WHERE i.event_id = ?
  GROUP BY i.kategori
`)
const dashCountsStmt = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM attendances WHERE event_id = ? AND status = 'success') AS success,
    (SELECT COUNT(*) FROM attendances WHERE event_id = ? AND status = 'duplicate') AS reentry,
    (SELECT COUNT(*) FROM scan_errors WHERE event_id = ?) AS invalid
`)
// Jumlah scan sukses per 15 menit (bucket UTC, ditampilkan jam lokal di client)
const dashTimelineStmt = db.prepare(`
  SELECT strftime('%Y-%m-%dT%H:', scanned_at)
      || printf('%02d', (CAST(strftime('%M', scanned_at) AS INTEGER) / 15) * 15)
      || ':00Z' AS bucket,
    COUNT(*) AS total
  FROM attendances
  WHERE event_id = ? AND status = 'success'
  GROUP BY bucket
  ORDER BY bucket
`)
const dashDevicesStmt = db.prepare(`
  SELECT scanner_id,
    SUM(status = 'success') AS success,
    SUM(status = 'duplicate') AS reentry,
    SUM(status = 'invalid') AS invalid,
    strftime('%Y-%m-%dT%H:%M:%SZ', MAX(scanned_at)) AS last_at
  FROM (
    SELECT scanner_id, status, scanned_at FROM attendances WHERE event_id = ?
    UNION ALL
    SELECT scanner_id, 'invalid', scanned_at FROM scan_errors WHERE event_id = ?
  )
  GROUP BY scanner_id
  ORDER BY scanner_id
`)
// Scan QR tidak valid terbaru (masuk kembali bukan masalah, jadi tidak ikut)
const dashIssuesStmt = db.prepare(`
  SELECT qr_code, scanner_id, strftime('%Y-%m-%dT%H:%M:%SZ', scanned_at) AS scanned_at
  FROM scan_errors
  WHERE event_id = ?
  ORDER BY scanned_at DESC, id DESC
  LIMIT 10
`)
const countInvitationsByEventStmt = db.prepare('SELECT COUNT(*) as count FROM invitations WHERE event_id = ?')

const getInvitationsForQRCodesStmt = db.prepare(`
  SELECT family_group, qr_code, name, prodi, jenjang, nim, kelas, kategori
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
    i.nim,
    i.kelas,
    i.kategori,
    CASE 
      WHEN a.id IS NOT NULL AND a.status = 'success' THEN 'hadir'
      WHEN a.id IS NOT NULL AND a.status = 'duplicate' THEN 'duplicate'
      ELSE 'belum'
    END AS status,
    strftime('%Y-%m-%dT%H:%M:%SZ', a.scanned_at) AS scanned_at
  FROM invitations i
  LEFT JOIN attendances a ON a.event_id = i.event_id AND a.qr_code = i.qr_code AND a.status = 'success'
  WHERE i.event_id = ?
  ORDER BY i.family_group ASC, i.kategori ASC
`)

export function findInvitation(eventId, qrCode) {
  return findInvitationStmt.get(eventId, qrCode)
}

/**
 * Catat satu scan undangan valid. scannedAt format SQLite UTC ('YYYY-MM-DD HH:MM:SS').
 * Scan dengan waktu PALING AWAL selalu jadi 'success' (masuk pertama) — penting untuk
 * scan offline yang baru terkirim setelah perangkat lain sudah mencatat QR yang sama.
 */
export const recordScan = db.transaction((eventId, inv, scannerId, scannedAt, clientScanId) => {
  const first = getSuccessByQrStmt.get(eventId, inv.qr_code)
  let status = 'success'
  if (first) {
    if (scannedAt < first.scanned_at) {
      demoteToDuplicateStmt.run(first.id)
    } else {
      status = 'duplicate'
    }
  }
  const { lastInsertRowid } = insertScanStmt.run(eventId, inv.qr_code, inv.name, scannerId, status, scannedAt, clientScanId)
  const previous = getPreviousScanStmt.get(eventId, inv.qr_code, lastInsertRowid, scannedAt)
  return { status, previous }
})

export function findScanByClientId(clientScanId) {
  if (!clientScanId) return null
  const att = findAttendanceByClientIdStmt.get(clientScanId)
  if (att) return { type: 'attendance', row: att }
  const err = findScanErrorByClientIdStmt.get(clientScanId)
  if (err) return { type: 'error', row: err }
  return null
}

// Data ringkas untuk validasi scan di perangkat saat offline
export function getOfflineData(eventId) {
  return {
    invitations: db.prepare(`
      SELECT qr_code, name, kategori, family_group, nim, kelas, prodi, jenjang
      FROM invitations WHERE event_id = ?
    `).all(eventId),
    scanned: db.prepare(`
      SELECT qr_code, strftime('%Y-%m-%dT%H:%M:%SZ', MIN(scanned_at)) AS first_scanned_at
      FROM attendances WHERE event_id = ? AND status = 'success'
      GROUP BY qr_code
    `).all(eventId),
  }
}

// Detail lengkap untuk tampilan hasil scan: info mahasiswa + status tiap anggota keluarga
export function getScanDetail(eventId, inv) {
  const members = getFamilyMembersStmt.all(eventId, inv.family_group)
  const mhs = members.find(m => m.kategori === 'mahasiswa') || {}
  const self = members.find(m => m.qr_code === inv.qr_code) || {}
  return {
    kategori: inv.kategori,
    family_group: inv.family_group,
    mahasiswa_name: mhs.name || null,
    nim: mhs.nim || null,
    kelas: mhs.kelas || null,
    prodi: mhs.prodi || null,
    jenjang: mhs.jenjang || null,
    first_scanned_at: self.scanned_at || null,
    ...getScanHistoryStmt.get(eventId, inv.qr_code, eventId, inv.qr_code),
    family: members.map(m => ({ kategori: m.kategori, name: m.name, qr_code: m.qr_code, scanned_at: m.scanned_at })),
  }
}

export function getAllAttendances(eventId, limit = 50) {
  return getAllAttendancesStmt.all(eventId, limit)
}

// Hitung statistik per keluarga (family-based)
// Hanya mahasiswa (kategori='mahasiswa') yang dihitung sebagai representasi keluarga
export function getStats(eventId) {
  const totalRow = db.prepare(
    'SELECT COUNT(DISTINCT family_group) AS total FROM invitations WHERE event_id = ?'
  ).get(eventId)

  const hadirRow = db.prepare(`
    SELECT COUNT(DISTINCT i.family_group) AS hadir
    FROM invitations i
    JOIN attendances a ON a.qr_code = i.qr_code
      AND a.event_id = i.event_id
      AND a.status = 'success'
    WHERE i.event_id = ? AND i.kategori = 'mahasiswa'
  `).get(eventId)

  const total = totalRow.total || 0
  const hadir = hadirRow.hadir || 0
  return { total, hadir, belumHadir: total - hadir }
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

export function createInvitation(eventId, familyGroup, qrCode, name, prodi, jenjang, kategori, nim, kelas) {
  return createInvitationStmt.run(eventId, familyGroup, qrCode, name, prodi || null, jenjang || null, nim || null, kelas || null, kategori, 1)
}

// ---------- Kelola satu keluarga (mahasiswa + ayah + ibu) ----------

const getFamilyStmt = db.prepare('SELECT * FROM invitations WHERE event_id = ? AND family_group = ?')
const updateMahasiswaStmt = db.prepare(`
  UPDATE invitations SET name = ?, prodi = ?, jenjang = ?, nim = ?, kelas = ?
  WHERE event_id = ? AND qr_code = ?
`)
const updateInvitationNameStmt = db.prepare('UPDATE invitations SET name = ? WHERE event_id = ? AND qr_code = ?')
// Nama di attendances adalah salinan saat scan; ikut diperbarui agar laporan konsisten
const updateAttendanceNameStmt = db.prepare('UPDATE attendances SET name = ? WHERE event_id = ? AND qr_code = ?')
const deleteAttendancesByQrStmt = db.prepare('DELETE FROM attendances WHERE event_id = ? AND qr_code = ?')
const deleteFamilyStmt = db.prepare('DELETE FROM invitations WHERE event_id = ? AND family_group = ?')

// Nama orang tua otomatis dari nama mahasiswa (sama seperti saat import)
export const defaultNamaAyah = (nama) => `Bapak sdr. ${nama}`
export const defaultNamaIbu = (nama) => `Ibu sdr. ${nama}`

export function getFamily(eventId, familyGroup) {
  return getFamilyStmt.all(eventId, familyGroup)
}

// d: { qr_code, name, prodi, jenjang, nim, kelas, nama_ayah?, nama_ibu? }
export const createFamily = db.transaction((eventId, d) => {
  const base = d.qr_code
  return [
    createInvitation(eventId, base, `${base}-A`, d.name, d.prodi, d.jenjang, 'mahasiswa', d.nim, d.kelas),
    createInvitation(eventId, base, `${base}-B`, d.nama_ayah || defaultNamaAyah(d.name), null, null, 'ayah', null, null),
    createInvitation(eventId, base, `${base}-C`, d.nama_ibu || defaultNamaIbu(d.name), null, null, 'ibu', null, null),
  ].reduce((sum, r) => sum + r.changes, 0)
})

function renameMember(eventId, member, name) {
  if (!member || !name || member.name === name) return false
  updateInvitationNameStmt.run(name, eventId, member.qr_code)
  updateAttendanceNameStmt.run(name, eventId, member.qr_code)
  return true
}

/**
 * Perbarui data keluarga. d: { name, prodi, jenjang, nim, kelas, nama_ayah?, nama_ibu? }
 * Kode QR tidak bisa diubah (undangan sudah dicetak).
 * Kalau nama_ayah/nama_ibu tidak dikirim, nama orang tua yang masih format otomatis
 * ("Bapak sdr. <nama lama>") ikut disesuaikan; nama yang sudah diedit manual dibiarkan.
 * Kembalikan true kalau ada yang berubah.
 */
export const updateFamily = db.transaction((eventId, familyGroup, d) => {
  const members = getFamilyStmt.all(eventId, familyGroup)
  const mhs = members.find(m => m.kategori === 'mahasiswa')
  if (!mhs) return false
  const ayah = members.find(m => m.kategori === 'ayah')
  const ibu = members.find(m => m.kategori === 'ibu')

  const next = {
    name: d.name ?? mhs.name,
    prodi: d.prodi !== undefined ? (d.prodi || null) : mhs.prodi,
    jenjang: d.jenjang !== undefined ? (d.jenjang || null) : mhs.jenjang,
    nim: d.nim !== undefined ? (d.nim || null) : mhs.nim,
    kelas: d.kelas !== undefined ? (d.kelas || null) : mhs.kelas,
  }
  let changed = false
  if (['name', 'prodi', 'jenjang', 'nim', 'kelas'].some(k => (next[k] ?? null) !== (mhs[k] ?? null))) {
    updateMahasiswaStmt.run(next.name, next.prodi, next.jenjang, next.nim, next.kelas, eventId, mhs.qr_code)
    updateAttendanceNameStmt.run(next.name, eventId, mhs.qr_code)
    changed = true
  }

  const namaAyah = d.nama_ayah
    || (ayah && ayah.name === defaultNamaAyah(mhs.name) ? defaultNamaAyah(next.name) : null)
  const namaIbu = d.nama_ibu
    || (ibu && ibu.name === defaultNamaIbu(mhs.name) ? defaultNamaIbu(next.name) : null)
  if (renameMember(eventId, ayah, namaAyah)) changed = true
  if (renameMember(eventId, ibu, namaIbu)) changed = true
  return changed
})

// Hapus satu keluarga beserta data scan-nya. Kembalikan jumlah undangan terhapus.
export const deleteFamily = db.transaction((eventId, familyGroup) => {
  const members = getFamilyStmt.all(eventId, familyGroup)
  for (const m of members) deleteAttendancesByQrStmt.run(eventId, m.qr_code)
  return deleteFamilyStmt.run(eventId, familyGroup).changes
})

// Hapus semua data scan satu event (undangan tetap ada)
export const deleteAttendancesByEvent = db.transaction((eventId) => {
  deleteScanErrorsByEventStmt.run(eventId)
  return deleteAttendancesByEventStmt.run(eventId).changes
})

export function recordScanError(eventId, qrCode, scannerId, scannedAt, clientScanId) {
  return recordScanErrorStmt.run(eventId, qrCode, scannerId, scannedAt, clientScanId || null)
}

export function getEventsWithStats() {
  return getEventsWithStatsStmt.all()
}

export function getDashboard(eventId) {
  const kategori = {}
  for (const row of dashKategoriStmt.all(eventId, eventId)) {
    kategori[row.kategori] = { total: row.total, hadir: row.hadir }
  }
  return {
    keluarga: getStats(eventId),
    kategori,
    scans: dashCountsStmt.get(eventId, eventId, eventId),
    timeline: dashTimelineStmt.all(eventId),
    devices: dashDevicesStmt.all(eventId, eventId),
    issues: dashIssuesStmt.all(eventId),
  }
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
      nim: row.nim,
      kelas: row.kelas,
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