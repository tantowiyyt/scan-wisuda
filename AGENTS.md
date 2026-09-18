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
Seed database SQLite dengan data dummy (10 wisudawan).

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
- **QR format**: Plain text, contoh: `WSD-001`
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
│   ├── index.js          # Express + Socket.IO server
│   ├── db.js             # SQLite setup
│   ├── seed.js           # Database seeder
│   ├── routes/
│   │   └── scan.js       # API endpoints
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
        ├── App.jsx        # Root component
        ├── index.css      # Tailwind directives
        ├── hooks/
        │   ├── useScanner.js   # Tangkap input HID scanner
        │   └── useSocket.js    # Koneksi Socket.IO
        ├── pages/
        │   └── ScannerPage.jsx # Halaman utama scanner
        └── utils/
            └── sound.js        # Web Audio API beep
```

## API Endpoints
GET /api/events/:id/report.csv — Download laporan kehadiran CSV
