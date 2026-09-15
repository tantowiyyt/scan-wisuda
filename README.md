# Scan Wisuda

Sistem absensi digital untuk wisuda menggunakan QR code scanner (HID keyboard mode). Operator cukup arahkan scanner ke kartu wisudawan, data kehadiran langsung tercatat dan ter-update secara real-time.

## Fitur Utama

- **Scan HID Keyboard** — Kompatibel dengan USB barcode scanner mode keyboard, tanpa driver khusus
- **Real-time Update** — Menggunakan Socket.IO, semua client terhubung langsung mendapat update
- **Deteksi Duplikat** — Wisudawan yang sudah hadir akan ditandai "Sudah Hadir" (kuning)
- **Validasi QR** — QR code tidak valid ditampilkan merah dengan peringatan
- **Statistik Live** — Jumlah hadir vs total wisudawan ditampilkan di footer
- **Suara Feedback** — Bunyi bip untuk konfirmasi scan (berbeda untuk sukses/gagal)

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | Node.js + Express + Socket.IO |
| Database | SQLite (better-sqlite3) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Scanner | USB barcode scanner (HID keyboard emulation) |

## Quick Start

Lihat [AGENTS.md](./AGENTS.md) untuk instruksi lengkap.

```bash
# Install semua dependencies
npm run install:all

# Seed database
npm run seed

# Jalankan development
npm run dev
```

- Server: `http://localhost:3000`
- Client: `http://localhost:5173`

## Environment Variables

Buat file `.env` berdasarkan `.env.example` di masing-masing folder:

**server/.env**
```
PORT=3000
DB_PATH=./data/wisuda.db
```

**client/.env**
```
VITE_SERVER_URL=http://localhost:3000
```

## Production Build

```bash
npm run build    # Build client
npm run start    # Jalankan server (port 3000)
```

## API Endpoints

| Method | Endpoint | Body / Response |
|--------|----------|-----------------|
| POST | `/api/scan` | `{ "qr_code": "WSD-001", "scanner_id": "PC-1" }` |
| GET | `/api/attendances` | Daftar kehadiran terakhir |
| GET | `/api/stats` | `{ total, hadir, belumHadir }` |

## Socket.IO Events

| Event | Direction | Deskripsi |
|-------|-----------|-----------|
| `attendance_update` | Server → Client | Broadcast hasil scan ke semua client |
