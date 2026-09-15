import db from './db.js'
import { createEvent, createInvitation, getAllEvents } from './db.js'

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
  for (let i = 1; i <= 10; i++) {
    const qr_code = `WSD-${i.toString().padStart(3, '0')}`
    createInvitation(event2026.id, qr_code, `Mahasiswa ${i}`, `Orang Tua ${i}`, 2)
  }
  console.log(`Seed selesai: 10 undangan untuk ${event2026.name}`)
}

if (event2027) {
  for (let i = 1; i <= 5; i++) {
    const qr_code = `WSD-${i.toString().padStart(3, '0')}`
    createInvitation(event2027.id, qr_code, `Mahasiswa 2027-${i}`, `Orang Tua 2027-${i}`, 2)
  }
  console.log(`Seed selesai: 5 undangan untuk ${event2027.name}`)
}

if (event2026 && event2027) {
  console.log('Event 2028 dibiarkan kosong (untuk test import Excel)')
}

db.close()