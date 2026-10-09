/**
 * Script untuk standarisasi nama prodi:
 * - Hapus prefix "D3 " dan "D4 " dari kolom prodi
 * - Fix "Sistem Informasi" jadi "Sistem Informasi Kota Cerdas"
 */

import db from './server/db.js'

console.log('=== SEBELUM ===')
const sebelum = db.prepare(`
  SELECT DISTINCT prodi, COUNT(*) as total 
  FROM invitations 
  WHERE prodi IS NOT NULL AND prodi != ''
  GROUP BY prodi 
  ORDER BY prodi
`).all()
sebelum.forEach(p => console.log(`  ${p.prodi} | ${p.total} undangan`))

// 1. Hapus prefix "D3 " dan "D4 "
const r1 = db.prepare(`
  UPDATE invitations 
  SET prodi = TRIM(REPLACE(REPLACE(prodi, 'D3 ', ''), 'D4 ', ''))
  WHERE prodi LIKE 'D3 %' OR prodi LIKE 'D4 %'
`).run()
console.log(`\n1. Hapus prefix D3/D4: ${r1.changes} baris diupdate`)

// 2. Fix "Sistem Informasi" jadi lengkap
const r2 = db.prepare(`
  UPDATE invitations 
  SET prodi = 'Sistem Informasi Kota Cerdas'
  WHERE prodi = 'Sistem Informasi'
`).run()
console.log(`2. Fix "Sistem Informasi": ${r2.changes} baris diupdate`)

console.log('\n=== SESUDAH ===')
const sesudah = db.prepare(`
  SELECT DISTINCT prodi, jenjang, COUNT(*) as total 
  FROM invitations 
  WHERE prodi IS NOT NULL AND prodi != ''
  GROUP BY prodi, jenjang 
  ORDER BY prodi, jenjang
`).all()
sesudah.forEach(p => console.log(`  ${p.prodi} | ${p.jenjang} | ${p.total} undangan`))

console.log('\nSelesai.')