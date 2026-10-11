# TESTING.md — Skenario Pengujian

Persiapan:
```bash
npm run install:all
npm run seed
npm run dev
```
Buka browser di `http://localhost:5173`.

---

## 1. Scan Sukses

**Kode**: `WSD-001-A`

| Ekspektasi | Detail |
|------------|--------|
| Kotak status | Hijau dengan ikon ✓ dan label "HADIR" |
| Nama wisudawan | Muncul di bawah label |
| Suara | Bip pendek tinggi (1200 Hz, 100ms) |
| Input field | Menampilkan `WSD-001-A` |
| Sidebar | Nama muncul di paling atas daftar kehadiran |
| Footer | Jumlah hadir bertambah 1 |

---

## 2. Scan Duplikat

**Kode**: `WSD-001-A` (scan kedua kalinya)

| Ekspektasi | Detail |
|------------|--------|
| Kotak status | Kuning dengan ikon ⚠ dan label "SUDAH HADIR" |
| Nama wisudawan | Tetap tampil |
| Suara | Bip panjang rendah (400 Hz, 200ms) |
| Sidebar | Tidak ada entri baru (tidak double) |
| Footer | Jumlah hadir tetap sama |

---

## 3. QR Tidak Valid

**Kode**: `XXX-999` (atau kode apapun yang tidak ada di database)

| Ekspektasi | Detail |
|------------|--------|
| Kotak status | Merah dengan ikon ✗ dan label "QR TIDAK VALID" |
| Nama wisudawan | Tidak tampil |
| Suara | Bip panjang rendah (400 Hz, 200ms) |
| Input field | Menampilkan `XXX-999` |

---

## 4. Real-time Multi-Tab

**Langkah**:
1. Buka `http://localhost:5173` di dua tab browser
2. Pastikan keduanya menunjukkan status "connected" (dot hijau)
3. Scan `WSD-002` di tab pertama

| Ekspektasi | Detail |
|------------|--------|
| Tab 1 | Langsung menampilkan hasil scan |
| Tab 2 | Otomatis update tanpa refresh |
| Kedua tab | Sidebar dan footer sinkron |

---

## 5. Statistik Footer

**Posisi**: Bagian bawah halaman

| Ekspektasi | Detail |
|------------|--------|
| Format | "Hadir: X / Total: 10" |
| Setelah scan sukses pertama | "Hadir: 1 / Total: 10" |
| Setelah scan sukses kedua | "Hadir: 2 / Total: 10" |
| Setelah scan duplikat | Tidak berubah |

---

## 6. Test Scanner HID Fisik

**Alat**: USB barcode scanner yang sudah diatur ke mode HID Keyboard

**Langkah**:
1. Pastikan scanner terhubung ke komputer
2. Arahkan scanner ke kartu wisudawan (atau print QR code)
3. Scanner akan mengirim karakter sebagai keyboard input + Enter di akhir

| Ekspektasi | Detail |
|------------|--------|
| Input | Tidak perlu fokus ke input field (scanner langsung ke window) |
| Kecepatan | Karakter masuk sangat cepat (bukan ketikan manusia) |
| Hasil | Sama seperti scan manual di browser (hijau/kuning/merah) |

**Catatan**: Jika scanner tidak terdeteksi, pastikan mode scanner adalah "HID Keyboard" bukan "USB COM" atau "RS232".
