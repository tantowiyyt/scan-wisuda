import db, { insertGraduate } from './db.js'

const faculties = [
  { code: 'FT', name: 'Fakultas Teknik', majors: ['Teknik Informatika', 'Teknik Elektro', 'Teknik Mesin', 'Teknik Sipil', 'Teknik Kimia'] },
  { code: 'FE', name: 'Fakultas Ekonomi', majors: ['Manajemen', 'Akuntansi', 'Ekonomi Pembangunan', 'Ilmu Ekonomi'] },
  { code: 'FH', name: 'Fakultas Hukum', majors: ['Ilmu Hukum'] },
  { code: 'FK', name: 'Fakultas Kedokteran', majors: ['Pendidikan Dokter', 'Keperawatan', 'Kesehatan Masyarakat'] },
  { code: 'FISIP', name: 'Fakultas Ilmu Sosial dan Politik', majors: ['Ilmu Komunikasi', 'Ilmu Politik', 'Sosiologi', 'Antropologi'] },
  { code: 'FMIPA', name: 'Fakultas Matematika dan Ilmu Pengetahuan Alam', majors: ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Statistika'] },
  { code: 'FP', name: 'Fakultas Psikologi', majors: ['Psikologi'] },
  { code: 'FPsi', name: 'Fakultas Peternakan', majors: ['Peternakan'] },
]

const firstNames = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Guntur', 'Hani', 'Indra', 'Joko',
  'Kartika', 'Lestari', 'Mulyono', 'Ningsih', 'Oka', 'Putra', 'Qori', 'Rini', 'Sari', 'Tono',
  'Umar', 'Vina', 'Wawan', 'Xenia', 'Yanti', 'Zaki', 'Adi', 'Bella', 'Candra', 'Dian'
]

const lastNames = [
  'Santoso', 'Wijaya', 'Kusuma', 'Suryono', 'Hidayat', 'Pratama', 'Permadi', 'Saputra',
  'Wibowo', 'Gunawan', 'Harsono', 'Iswanto', 'Jatmiko', 'Kurniawan', 'Laksana', 'Mahendra',
  'Nugroho', 'Oktavian', 'Prabowo', 'Qomaruddin', 'Raharja', 'Sutrisno', 'Tjahjono', 'Utoyo',
  'Vijaya', 'Wijayanto', 'Xavier', 'Yudhistira', 'Zulkarnain', 'Anugerah', 'Baskara', 'Cahyo'
]

function randomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)]
  const last = lastNames[Math.floor(Math.random() * lastNames.length)]
  return `${first} ${last}`
}

function randomNim() {
  const year = 2020 + Math.floor(Math.random() * 5)
  const facultyCode = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${year}${facultyCode}${num}`
}

const insert = db.transaction((graduates) => {
  for (const g of graduates) {
    insertGraduate.run(g.id, g.name, g.nim, g.faculty, g.major)
  }
})

const total = 100
const graduates = []

for (let i = 1; i <= total; i++) {
  const faculty = faculties[Math.floor(Math.random() * faculties.length)]
  const major = faculty.majors[Math.floor(Math.random() * faculty.majors.length)]
  const id = `WSD-${i.toString().padStart(3, '0')}`
  const nim = randomNim()
  
  graduates.push({
    id,
    name: randomName(),
    nim,
    faculty: faculty.name,
    major
  })
}

insert(graduates)

console.log(`✅ Seeded ${total} graduates`)
console.log(`Sample: ${graduates[0].id} - ${graduates[0].name} (${graduates[0].nim})`)