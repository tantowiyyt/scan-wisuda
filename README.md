# Scan Wisuda — Absensi QR Code

Sistem absensi digital untuk wisuda menggunakan QR code scanner (HID keyboard mode).

## Stack
- **Backend**: Node.js + Express + Socket.IO + SQLite (better-sqlite3)
- **Frontend**: React 18 + Vite + Tailwind CSS v3
- **Scanner**: USB barcode scanner (HID keyboard emulation)

## Quick Start

```bash
# Install dependencies (root + workspaces)
npm run install:all

# Seed database dengan data dummy
npm run seed

# Development (server:3000 + client:5173)
npm run dev
```

## Environment Variables
Buat `server/.env`:
```env
PORT=3000
DB_PATH=./data/wisuda.db
```

Buat `client/.env`:
```env
VITE_SERVER_URL=http://localhost:3000
```

## Production Build
```bash
npm run build
npm run start
```

## API Endpoints
- `POST /api/scan` — Body: `{ "code": "WSD-001", "scanner_id": "PC-1" }`
- `GET /api/graduates` — List all graduates
- `GET /api/stats` — Summary stats
- `GET /api/scans` — Scan history

## Socket.IO Events
- `scan:result` — Broadcast hasil scan ke semua client terhubung
- `stats:update` — Broadcast update statistik