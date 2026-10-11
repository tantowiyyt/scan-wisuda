# Catatan VPS — Scan Wisuda

Catatan lengkap server produksi: cara masuk, cara pasang dari nol, perintah sehari-hari,
dan cara mengatasi masalah yang pernah ditemui.

> 🔒 Jangan tulis IP, password, atau isi `server/.env` di file ini — repo bisa dibaca orang lain.
> Simpan di catatan panitia.

---

## 0. Ringkasan server

| Hal | Nilai |
|-----|-------|
| Sistem operasi | Ubuntu 24.04 LTS |
| Akses | `http://wisuda-qr-polindra.my.id` → **HTTPS belum dipasang** (lihat bagian 5) |
| Domain | `wisuda-qr-polindra.my.id` — DNS di Rumahweb, record **A** → IP VPS (record `www` belum ada) |
| User aplikasi | `wisuda` (aplikasi **tidak** dijalankan sebagai root) |
| Folder aplikasi | `/home/wisuda/scan-wisuda` |
| Pengaturan & password | `/home/wisuda/scan-wisuda/server/.env` |
| Database | `/home/wisuda/scan-wisuda/server/data/wisuda.db` |
| Backup | `/home/wisuda/scan-wisuda/server/data/backups/` (otomatis tiap 30 menit, disimpan 7 hari) |
| Layanan aplikasi | `scan-wisuda` (systemd) — file: `deploy/scan-wisuda.service` |
| Web server | nginx — file: `deploy/nginx-scan-wisuda.conf` |
| Zona waktu | Asia/Jakarta (WIB) |
| Firewall | `ufw`: OpenSSH + Nginx Full. Panel penyedia VPS: buka TCP 80 (dan 443 nanti) |

Alur akses: `Perangkat scanner → nginx (port 80) → aplikasi Node (127.0.0.1:3000)`.

---

## 1. Cara masuk ke VPS (SSH dari Windows)

Buka **PowerShell** di laptop:

```powershell
ssh root@IP-VPS
```

- Pertama kali muncul pertanyaan *"Are you sure you want to continue connecting"* → ketik `yes`.
- Saat mengetik password **tidak ada karakter yang muncul** — normal, ketik lalu Enter.
- Berhasil kalau prompt berubah jadi `root@VM-...:~#`.
- Kalau penyedia memberi file key: `ssh -i C:\lokasi\key.pem root@IP-VPS`
- Keluar dari VPS: `exit`

### ⚠️ Aturan menjalankan perintah

1. **Satu baris per satu kali.** Menempel blok panjang ke terminal SSH sering rusak
   (baris terpecah / ikut spasi di depan).
2. Kalau muncul tanda **`>`** terus-menerus → tekan **Ctrl+C**, lalu ulangi per baris.
3. Perhatikan prompt:
   - `root@...#` → sedang sebagai **root** (untuk systemctl, nginx, apt, cron)
   - `wisuda@...$` → sedang sebagai **wisuda** (untuk git, npm, isi aplikasi)
   - Pindah ke wisuda: `sudo -iu wisuda` — kembali ke root: `exit`

---

## 2. Perintah sehari-hari

Semua dijalankan sebagai **root** kecuali disebut lain.

| Kebutuhan | Perintah |
|-----------|----------|
| Cek aplikasi hidup? | `systemctl status scan-wisuda --no-pager \| head -5` → harus `active (running)` |
| Lihat log terakhir | `journalctl -u scan-wisuda --no-pager \| tail -30` |
| Lihat log langsung (live) | `journalctl -u scan-wisuda -f` (keluar: Ctrl+C) |
| Restart aplikasi | `systemctl restart scan-wisuda` |
| Cek server menjawab | `curl -s localhost:3000/api/auth/me` → `{"status":"success","data":null}` |
| Cek nginx | `nginx -t` lalu `systemctl status nginx --no-pager \| head -5` |
| Sisa disk & RAM | `df -h /` dan `free -h` |
| Jam server | `date` (harus WIB) |

### Update aplikasi (setelah ada perubahan di GitHub)

```bash
sudo -iu wisuda
```
```bash
cd scan-wisuda && bash deploy.sh
```
```bash
exit
```
```bash
systemctl restart scan-wisuda
```

`deploy.sh` = `git pull` + `npm run install:all` + `npm run build`.
Kalau perubahannya menyentuh file di folder `deploy/` (systemd/nginx), salin ulang file itu (lihat bagian 4 & 5).

### Ganti password (admin / operator / reset)

```bash
nano /home/wisuda/scan-wisuda/server/.env
```
Ubah baris `ADMIN_PASSWORD=`, `SCANNER_PASSWORD=`, atau `RESET_PASSWORD=`.
Simpan: **Ctrl+O → Enter → Ctrl+X**. Lalu:
```bash
systemctl restart scan-wisuda
```
Semua yang login dengan password lama otomatis logout dan harus login ulang.

### Backup

Backup manual (mis. sebelum acara dimulai):
```bash
sudo -u wisuda bash /home/wisuda/scan-wisuda/deploy/backup-db.sh
```
Lihat daftar backup:
```bash
ls -lh /home/wisuda/scan-wisuda/server/data/backups/
```
Cek jadwal backup otomatis:
```bash
crontab -u wisuda -l
```

Ambil backup ke laptop (jalankan di **PowerShell laptop**, bukan di VPS):
```powershell
scp root@IP-VPS:/home/wisuda/scan-wisuda/server/data/backups/NAMA-FILE.db .
```

### Pulihkan dari backup

```bash
systemctl stop scan-wisuda
```
```bash
cd /home/wisuda/scan-wisuda/server/data
```
```bash
cp wisuda.db wisuda-sebelum-restore.db
```
```bash
cp backups/NAMA-FILE.db wisuda.db
```
```bash
rm -f wisuda.db-wal wisuda.db-shm
```
```bash
chown wisuda:wisuda wisuda.db
```
```bash
systemctl start scan-wisuda
```

---

## 3. Pemasangan dari nol (riwayat langkah yang dijalankan)

Untuk VPS baru. Semua sebagai **root**, **satu baris per satu kali**.

### 3.1 Paket dasar
```bash
apt update && apt upgrade -y
```
```bash
apt install -y git curl build-essential python3 nginx sqlite3 ufw
```
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
```
```bash
apt install -y nodejs
```
```bash
timedatectl set-timezone Asia/Jakarta
```
Cek: `node -v; npm -v; nginx -v; date`

### 3.2 Swap 2 GB (cadangan RAM saat build)
```bash
[ -f /swapfile ] || (fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab)
```

### 3.3 User aplikasi
```bash
id wisuda >/dev/null 2>&1 || adduser --disabled-password --gecos "" wisuda
```

### 3.4 Kunci GitHub (repo privat)
```bash
sudo -u wisuda mkdir -p -m 700 /home/wisuda/.ssh
```
```bash
sudo -u wisuda ssh-keygen -t ed25519 -C "vps-scan-wisuda" -f /home/wisuda/.ssh/id_ed25519 -N ""
```
```bash
cat /home/wisuda/.ssh/id_ed25519.pub
```
Salin baris `ssh-ed25519 ...` → GitHub repo → **Settings → Deploy keys → Add deploy key**
(judul bebas, **jangan** centang *Allow write access*). Uji:
```bash
sudo -u wisuda ssh -o StrictHostKeyChecking=accept-new -T git@github.com
```
Berhasil kalau muncul *"Hi tantowiyyt/scan-wisuda! You've successfully authenticated"*.

### 3.5 Unduh, pasang, build (sebagai wisuda)
```bash
sudo -iu wisuda
```
```bash
git clone git@github.com:tantowiyyt/scan-wisuda.git
```
```bash
cd scan-wisuda
```
```bash
npm run install:all
```
```bash
npm run build
```
```bash
cp server/.env.example server/.env
```
```bash
nano server/.env
```
Isi:
```
PORT=3000
DB_PATH=./data/wisuda.db
ADMIN_PASSWORD=<password admin>
SCANNER_PASSWORD=<password operator>
RESET_PASSWORD=<password reset presensi>
TRUST_PROXY=1
HOST=127.0.0.1
```
- `TRUST_PROXY=1` → aplikasi tahu IP asli perangkat (di belakang nginx). Tanpa ini, 5x salah
  password di satu perangkat akan mengunci login **semua** perangkat.
- `HOST=127.0.0.1` → port 3000 hanya bisa diakses dari dalam VPS (lewat nginx).
- Buat password acak: `openssl rand -base64 12`

> ⚠️ **Jangan pernah `npm run seed` di VPS** — menghapus semua data.

Cek, lalu kembali ke root:
```bash
ls client/dist; grep -c PASSWORD= server/.env; cd server && node -e "require('better-sqlite3'); console.log('sqlite OK')"; cd ..
```
```bash
exit
```

### 3.6 Layanan systemd
```bash
cp /home/wisuda/scan-wisuda/deploy/scan-wisuda.service /etc/systemd/system/
```
```bash
systemctl daemon-reload
```
```bash
systemctl enable --now scan-wisuda
```
Cek: `systemctl status scan-wisuda --no-pager | head -5` → `active (running)`

### 3.7 nginx
```bash
cp /home/wisuda/scan-wisuda/deploy/nginx-scan-wisuda.conf /etc/nginx/sites-available/scan-wisuda
```
```bash
ln -sf /etc/nginx/sites-available/scan-wisuda /etc/nginx/sites-enabled/scan-wisuda
```
```bash
rm -f /etc/nginx/sites-enabled/default
```
```bash
nginx -t
```
```bash
systemctl reload nginx
```

### 3.8 Firewall (urutan penting: SSH dulu!)
```bash
ufw allow OpenSSH
```
```bash
ufw allow 'Nginx Full'
```
```bash
ufw enable
```
Ketik `y`. Lalu di **panel web penyedia VPS → Firewall / Security Group**: izinkan **TCP 80** (dan **443**).

### 3.9 Backup otomatis tiap 30 menit
```bash
(crontab -u wisuda -l 2>/dev/null; echo "*/30 * * * * bash /home/wisuda/scan-wisuda/deploy/backup-db.sh >/dev/null 2>&1") | crontab -u wisuda -
```
Uji: `sudo -u wisuda bash /home/wisuda/scan-wisuda/deploy/backup-db.sh`

### 3.10 Isi data pertama
Buka `http://IP-VPS` → login **admin** → **Events** → buat event → **Import Excel** daftar wisudawan
→ **Pilih** event.

---

## 4. Masalah yang pernah terjadi & solusinya

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Terminal menampilkan `>` terus setelah menempel perintah | Penutup `EOF` ikut spasi di depan, atau tanda kutip belum tertutup | **Ctrl+C**, lalu jalankan per baris. Konfigurasi panjang ambil dari folder `deploy/` (git pull + cp) |
| `RestartSec=3: command not found` | Perintah panjang terpecah saat ditempel, tiap baris dijalankan sebagai perintah | Sama seperti di atas: pakai `cp` dari folder `deploy/` |
| `cd scan-wisuda: No such file or directory` | `git clone` belum dijalankan / sedang bukan user wisuda | `sudo -iu wisuda` lalu `git clone ...` |
| `find: Failed to restore initial working directory: Permission denied` | Skrip dijalankan dari folder yang tidak boleh dimasuki user wisuda | Sudah diperbaiki di skrip (pindah folder otomatis). `git pull` versi terbaru |
| Jam di laporan CSV maju 1 jam | Zona waktu VPS bawaan CST (UTC+8) | `timedatectl set-timezone Asia/Jakarta` lalu `systemctl restart scan-wisuda` |
| Browser loading lama lalu timeout | Port 80 ditutup firewall panel penyedia | Buka TCP 80 di panel VPS (Firewall / Security Group) |
| Browser: **502 Bad Gateway** | Aplikasi Node mati / gagal start | `systemctl status scan-wisuda`, lihat `journalctl -u scan-wisuda --no-pager \| tail -30`, lalu `systemctl restart scan-wisuda` |
| Log: `ADMIN_PASSWORD belum diisi` | `server/.env` kosong / salah tempat | Isi `/home/wisuda/scan-wisuda/server/.env`, restart |
| `npm run build` gagal / proses terbunuh (*Killed*) | RAM habis | Pastikan swap aktif: `swapon --show` (langkah 3.2) |
| `certbot: command not found` | Paket certbot belum dipasang | `apt install -y certbot python3-certbot-nginx` |
| Tampilan web tidak berubah setelah update | Build belum dijalankan / cache browser | Ulangi `bash deploy.sh` + restart, lalu Ctrl+F5 di browser |
| Semua perangkat terkunci login 1 menit | `TRUST_PROXY` tidak diisi | Isi `TRUST_PROXY=1` di `.env`, restart |

---

## 5. HTTPS — ⏳ BELUM SELESAI (lanjutkan dari sini)

Dengan HTTPS: ikon gembok, cookie login lebih aman, dan halaman tetap bisa dibuka walau
di-refresh saat internet putus (Service Worker aktif). Sertifikat dari **Let's Encrypt — gratis**,
berlaku 90 hari dan diperpanjang otomatis.

**Sudah dikerjakan**
- [x] Record DNS **A** `wisuda-qr-polindra.my.id` → IP VPS di Rumahweb (Name dikosongkan; `@` tidak diterima form Rumahweb)
- [x] Port 443 terbuka di panel penyedia (Tencent Cloud)

**Langkah berikutnya** (sebagai root, satu baris per satu kali):
```bash
apt install -y certbot python3-certbot-nginx
```
```bash
sed -i 's/server_name _;/server_name wisuda-qr-polindra.my.id www.wisuda-qr-polindra.my.id;/' /etc/nginx/sites-available/scan-wisuda
```
```bash
nginx -t
```
```bash
systemctl reload nginx
```
```bash
certbot --nginx -d wisuda-qr-polindra.my.id --redirect
```
Isi email (untuk pemberitahuan), `Y` untuk Terms of Service, `N` untuk berbagi email dengan EFF.
```bash
certbot renew --dry-run
```
Harus: *"Congratulations, all simulated renewals succeeded"*.

**Setelah HTTPS aktif**
- Buka `https://wisuda-qr-polindra.my.id` — harus ada ikon gembok.
- Semua perangkat **login ulang** di alamat https, isi ulang **nama perangkat**, dan buka halaman **Scan**
  saat online (data tersimpan per alamat, jadi yang dari `http://IP` tidak ikut).
- ⚠️ Jangan lagi menyalin `deploy/nginx-scan-wisuda.conf` ke `/etc/nginx/sites-available/` —
  akan menghapus pengaturan SSL buatan certbot. Kalau terlanjur, jalankan ulang perintah `certbot` di atas.
- Mau `www.wisuda-qr-polindra.my.id` juga? Tambah record **A** `www` → IP VPS di Rumahweb, lalu
  `certbot --nginx -d wisuda-qr-polindra.my.id -d www.wisuda-qr-polindra.my.id --redirect`.

---

## 6. Checklist hari H

- [ ] `systemctl status scan-wisuda` → active (running), `date` → WIB
- [ ] Backup manual sebelum acara dimulai
- [ ] Login operator di semua perangkat, tiap perangkat diberi **nama** berbeda
- [ ] Semua perangkat sudah membuka halaman **Scan** saat online (cek "Data offline" di panel kanan bawah)
- [ ] Gladi resik: scan beberapa undangan → **Reset Presensi**
- [ ] Uji offline: matikan WiFi perangkat → scan → nyalakan → muncul "scan offline berhasil dikirim"
- [ ] Hotspot HP cadangan siap
- [ ] Selama acara: download **Laporan CSV** berkala dari Dashboard
