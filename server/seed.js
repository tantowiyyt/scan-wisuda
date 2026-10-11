import './env.js'
import db from './db.js'
import { createEvent, createInvitation, getAllEvents } from './db.js'

// Wisuda 2026 (3 families)
const MAHASISWA_2026 = [
  { qrBase: 'WSD-001', name: 'Michael Arsil', prodi: 'D3 Teknik Informatika', jenjang: 'D3', nim: '2201001', kelas: 'TI-3A' },
  { qrBase: 'WSD-002', name: 'Siti Nurhaliza', prodi: 'D4 Rekayasa Perangkat Lunak', jenjang: 'D4', nim: '2202002', kelas: 'RPL-4B' },
  { qrBase: 'WSD-003', name: 'Budi Setiawan', prodi: 'D3 Teknik Mesin', jenjang: 'D3', nim: '2203003', kelas: 'TM-3A' }
]

// Wisuda 2027 (2 families)
const MAHASISWA_2027 = [
  { qrBase: 'WSD-001', name: 'Kartika Dewi Lestari', prodi: 'D4 Rekayasa Perangkat Lunak', jenjang: 'D4', nim: '2204004', kelas: 'RPL-4A' },
  { qrBase: 'WSD-002', name: 'Luthfi Hakim', prodi: 'D3 Teknik Informatika', jenjang: 'D3', nim: '2205005', kelas: 'TI-3B' }
]

// Wisuda 2028 (kosong - untuk test import Excel)
const MAHASISWA_2028 = []

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
const event2028 = allEvents.find(e => e.year === 2028)

function seedFamilies(event, mahasiswaList) {
  if (!event) return
  for (const mhs of mahasiswaList) {
    const { qrBase, name, prodi, jenjang, nim, kelas } = mhs
    const namaAyah = `Bapak sdr. ${name}`
    const namaIbu = `Ibu sdr. ${name}`

    createInvitation(event.id, qrBase, `${qrBase}-A`, name, prodi, jenjang, 'mahasiswa', nim, kelas)
    createInvitation(event.id, qrBase, `${qrBase}-B`, namaAyah, null, null, 'ayah', null, null)
    createInvitation(event.id, qrBase, `${qrBase}-C`, namaIbu, null, null, 'ibu', null, null)
  }
  console.log(`Seed selesai: ${mahasiswaList.length * 3} undangan (${mahasiswaList.length} families) untuk ${event.name}`)
}

if (event2026) seedFamilies(event2026, MAHASISWA_2026)
if (event2027) seedFamilies(event2027, MAHASISWA_2027)
if (event2028) seedFamilies(event2028, MAHASISWA_2028)

console.log('Event 2028 dibiarkan kosong (untuk test import Excel)')

db.close()