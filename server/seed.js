import db from './db.js'

const deleteAttendances = db.prepare('DELETE FROM attendances')
const deleteInvitations = db.prepare('DELETE FROM invitations')
const insertInvitation = db.prepare('INSERT INTO invitations (qr_code, name, parent_name, quota) VALUES (?, ?, ?, ?)')

deleteAttendances.run()
deleteInvitations.run()

const insert = db.transaction((invitations) => {
  for (const inv of invitations) {
    insertInvitation.run(inv.qr_code, inv.name, inv.parent_name, inv.quota)
  }
})

const invitations = []

for (let i = 1; i <= 10; i++) {
  const qr_code = `WSD-${i.toString().padStart(3, '0')}`
  invitations.push({
    qr_code,
    name: `Mahasiswa ${i}`,
    parent_name: `Orang Tua ${i}`,
    quota: 2
  })
}

insert(invitations)

console.log('Seed selesai: 10 undangan ditambahkan')

db.close()