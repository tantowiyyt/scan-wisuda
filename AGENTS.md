# AGENTS.md — Scan Wisuda

## Project Overview
Aplikasi absensi QR code untuk wisuda. Scanner HID keyboard → Backend (Express + Socket.IO + SQLite) → Frontend React realtime.

## Commands
| Command | Description |
|---------|-------------|
| `npm run install:all` | Install dependencies di root, server, dan client |
| `npm run dev` | Jalankan server + client (concurrently) |
| `npm run seed` | Seed database SQLite dengan data dummy |
| `npm run build` | Build client untuk production |
| `npm run start` | Jalankan server production |

## Ports
- Server: 3000 (Express + Socket.IO)
- Client: 5173 (Vite dev server)

## Conventions
- ESM modules ("type": "module" di semua package.json)
- Tailwind CSS v3 (bukan v4)
- QR format: plain text (contoh: "WSD-001")
- Auth minimal: scanner_id via localStorage, default "PC-1"

## Structure
```
scan-wisuda/
├── package.json          # root workspace
├── .gitignore
├── AGENTS.md
├── README.md
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── index.js
│   ├── db.js
│   ├── seed.js
│   ├── routes/scan.js
│   └── data/
└── client/
    ├── package.json
    ├── .env.example
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── hooks/useScanner.js
        ├── hooks/useSocket.js
        ├── pages/ScannerPage.jsx
        └── utils/sound.js
```