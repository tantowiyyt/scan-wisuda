import db from './db.js'
import { createEvent, createInvitation, getAllEvents } from './db.js'

// Daftar prodi untuk seed data
const PRODI_D3 = [
  'Teknik Mesin',
  'Teknik Pendingin dan Tata Udara',
  'Teknik Informatika',
  'Keperawatan',
]

const PRODI_D4 = [
  'Perancangan Manufaktur',
  'Teknologi Rekayasa Instrumentasi dan Kontrol',
  'Rekayasa Perangkat Lunak',
  'Teknologi Rekayasa Komputer',
  'Sistem Informasi Kota Cerdas',
  'Teknologi Laboratorium Medis',
  'Teknologi Rekayasa Elektro-Medis',
  'Teknologi Rekayasa Material Maju',
]

// Data mahasiswa untuk Wisuda 2026
const MAHASISWA_2026 = [
  { name: 'Ahmad Rizki Pratama', prodi: 'Teknik Informatika', jenjang: 'D3' },
  { name: 'Siti Nurhaliza', prodi: 'Rekayasa Perangkat Lunak', jenjang: 'D4' },
  { name: 'Budi Santoso', prodi: 'Teknik Mesin', jenjang: 'D3' },
  { name: 'Dewi Kartika Sari', prodi: 'Teknologi Rekayasa Komputer', jenjang: 'D4' },
  { name: 'Eko Widodo', prodi: 'Keperawatan', jenjang: 'D3' },
  { name: 'Fitri Handayani', prodi: 'Sistem Informasi Kota Cerdas', jenjang: 'D4' },
  { name: 'Gunawan Wibisono', prodi: 'Teknologi Laboratorium Medis', jenjang: 'D4' },
  { name: 'Hana Permata Sari', prodi: 'Teknik Pendingin dan Tata Udara', jenjang: 'D3' },
  { name: 'Indra Kurniawan', prodi: 'Perancangan Manufaktur', jenjang: 'D4' },
  { name: 'Juli Amelia', prodi: 'Teknologi Rekayasa Material Maju', jenjang: 'D4' },
]

// Data mahasiswa untuk Wisuda 2027 (5 orang, cycle dari list yang sama)
const MAHASISWA_2027 = [
  { name: 'Kartika Dewi Lestari', prodi: 'Rekayasa Perangkat Lunak', jenjang: 'D4' },
  { name: 'Luthfi Hakim', prodi: 'Teknik Informatika', jenjang: 'D3' },
  { name: 'Maya Sari Anggraeni', prodi: 'Teknologi Rekayasa Komputer', jenjang: 'D4' },
  { name: 'Nanda Prasetyo', prodi: 'Teknik Mesin', jenjang: 'D3' },
  { name: 'Oktavia Rahmawati', prodi: 'Keperawatan', jenjang: 'D3' },
]

const deleteAttendances = db.prepare('DELETE FROM attendances')
const deleteInvitations = db.prepare('DELETE FROM invitations')
const deleteEvents = db.prepare('DELETE FROM events')

deleteAttendances.run()
deleteInvitations.run()
deleteEvents.run()

const events = [
  { name: 'Wisuda 2026', year: 2026, event_date: '2026-09-15' },
  { name: 'Wisuda 2027', year: 2027, event_date: '2027-09-15' },
  { name: 'Wisuda 2028', year: 2028, event_date: '2028-09-15' }
]

for (const ev of events) {
  const result = createEvent(ev.name, ev.year, ev.event_date)
  console.log(`Event dibuat: ${ev.name} (id: ${result.lastInsertRowid})`)
}

const allEvents = getAllEvents()
const event2026 = allEvents.find(e => e.year === 2026)
const event2027 = allEvents.find(e => e.year === 2027)

if (event2026) {
  for (let i = 0; i < MAHASISWA_2026.length; i++) {
    const mhs = MAHASISWA_2026[i]
    const qr_code = `WSD-${(i + 1).toString().padStart(3, '0')}`
    createInvitation(event2026.id, qr_code, mhs.name, mhs.prodi, mhs.jenjang, `Orang Tua ${i + 1}`, 2)
  }
  console.log(`Seed selesai: 10 undangan untuk ${event2026.name}`)
}

if (event2027) {
  for (let i = 0; i < MAHASISWA_2027.length; i++) {
    const mhs = MAHASISWA_2027[i]
    const qr_code = `WSD-${(i + 1).toString().padStart(3, '0')}`
    createInvitation(event2027.id, qr_code, mhs.name, mhs.prodi, mhs.jenjang, `Orang Tua 2027-${i + 1}`, 2)
  }
  console.log(`Seed selesai: 5 undangan untuk ${event2027.name}`)
}

if (event2026 && event2027) {
  console.log('Event 2028 dibiarkan kosong (untuk test import Excel)')
}

db.close()