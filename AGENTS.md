# AGENTS.md — Scan Wisuda

## Ringkasan Proyek
Aplikasi absensi QR code untuk wisuda. Scanner HID keyboard → Backend (Express + Socket.IO + SQLite) → Frontend React realtime.

## Cara Install
```bash
npm run install:all
```
Install dependencies di root, server, dan client sekaligus.

## Cara Seed
```bash
npm run seed
```
Seed database SQLite dengan data dummy: 3 event (Wisuda 2026: 3 keluarga, 2027: 2 keluarga, 2028: kosong untuk test import). **Menghapus semua data lama.**

## Cara Development
```bash
npm run dev
```
Jalankan server (port 3000) + client (port 5173) secara paralel.

## Cara Build Production
```bash
npm run build   # Build client ke client/dist/
npm start       # Jalankan server production (port 3000)
```

## Konvensi
- **ESM**: Semua file pakai `import/export` (`"type": "module"` di semua package.json)
- **Komentar**: Bahasa Indonesia di blok penting
- **Tailwind CSS v3** (bukan v4)
- **QR format**: Plain text per anggota keluarga — `<family_group>-A` (mahasiswa), `-B` (ayah), `-C` (ibu), contoh: `WSD-001-A`
- **Env server**: `server/.env` selalu dibaca (via `server/env.js`); `DB_PATH` relatif di-resolve dari folder `server/`
- **Timestamp**: `scanned_at` disimpan UTC di SQLite, dikirim API sebagai ISO dengan `Z`
- **Auth minimal**: `scanner_id` via localStorage, default `PC-1`
- **Jangan commit file `.env`** — gunakan `.env.example` sebagai template

## Struktur Folder
```
scan-wisuda/
├── package.json          # root workspace
├── .gitignore
├── AGENTS.md
├── README.md
├── TESTING.md
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── env.js            # Load server/.env (import pertama)
│   ├── index.js          # Express + Socket.IO server
│   ├── db.js             # SQLite setup + query
│   ├── seed.js           # Database seeder
│   ├── routes/
│   │   ├── scan.js       # POST /api/scan
│   │   ├── events.js     # CRUD event, import Excel, laporan CSV
│   │   └── qrcodes.js    # QR PNG/ZIP, CSV mail merge
│   └── data/             # SQLite database file
└── client/
    ├── package.json
    ├── .env.example
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx       # Entry point React
        ├── App.jsx        # Root component + routes
        ├── index.css      # Tailwind directives
        ├── components/
        │   └── Navbar.jsx      # Navigasi + pilih event aktif
        ├── constants/
        │   └── labels.js       # Ukuran stiker label (103/107/121)
        ├── hooks/
        │   ├── useScanner.js   # Tangkap input HID scanner
        │   ├── useSocket.js    # Koneksi Socket.IO
        │   └── useDarkMode.js  # Toggle dark mode
        ├── pages/
        │   ├── PilihEventPage.jsx
        │   ├── ScannerPage.jsx         # Halaman utama scanner
        │   ├── DaftarMahasiswaPage.jsx
        │   ├── ManagementEventsPage.jsx
        │   └── CetakQRPage.jsx
        └── utils/
            └── sound.js        # Web Audio API beep
```

## API Endpoints
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/scan` | `{ qr_code, scanner_id, event_id }` → `success` / `duplicate` / `not_found` |
| GET | `/api/attendances?event_id=` | Kehadiran terakhir (status success) |
| GET | `/api/stats?event_id=` | `{ total, hadir, belumHadir }` per keluarga |
| GET | `/api/invitations?event_id=` | Semua undangan + status |
| GET/POST | `/api/events` | List / buat event |
| GET/PUT/DELETE | `/api/events/:id` | Detail / update / hapus (cascade) |
| POST | `/api/events/:id/import` | Upload Excel (field `file`), 1 baris → 3 undangan |
| GET | `/api/events/:id/invitations` | Undangan dikelompokkan per keluarga |
| GET | `/api/events/:id/report.csv` | Laporan kehadiran CSV |
| DELETE | `/api/events/:id/attendances` | Reset presensi, body `{ password }` = `RESET_PASSWORD` (5x salah → kunci 1 menit) |
| GET | `/api/events/:id/qrcodes/preview` | Data untuk cetak QR |
| GET | `/api/events/:id/qrcodes/zip` | Semua QR PNG dalam ZIP |
| GET | `/api/events/:id/qrcodes/csv` | CSV untuk mail merge |
| GET | `/api/events/:id/qrcodes/:qr_code.png` | QR PNG satuan |

Socket.IO (server → semua client, client wajib filter by `event_id`):
- `attendance_update` → `{ status, qr_code, name, scanned_at, event_id }`
- `attendance_reset` → `{ event_id }`
