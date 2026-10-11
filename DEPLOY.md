# Panduan Deploy ke Laptop Panitia

## Persiapan Laptop Panitia

1. Install Node.js 20+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. Install Git:
   ```bash
   sudo apt install -y git
   ```

3. Install build tools:
   ```bash
   sudo apt install -y python3 build-essential
   ```

## Cara Deploy (Pertama Kali)

1. Clone:
   ```bash
   git clone git@github.com:tantowiyyt/scan-wisuda.git
   ```

2. Masuk ke folder:
   ```bash
   cd scan-wisuda
   ```

3. Install dependencies:
   ```bash
   npm run install:all
   ```

4. Seed database:
   ```bash
   npm run seed
   ```

5. Build client:
   ```bash
   npm run build
   ```

6. Jalankan server:
   ```bash
   npm start
   ```

Server akan berjalan di `http://localhost:3000`.

## Cara Update

1. Jalankan script deploy:
   ```bash
   bash deploy.sh
   ```

2. Hentikan server lama (Ctrl+C)

3. Jalankan server baru:
   ```bash
   npm start
   ```

## Akses dari PC Pemeriksa

1. Cari IP LAN laptop panitia:
   ```bash
   hostname -I
   # Contoh: 192.168.1.100
   ```

2. Buka firewall port 3000:
   ```bash
   sudo ufw allow 3000/tcp
   ```

3. PC pemeriksa buka browser:
   ```
   http://192.168.1.100:3000
   ```

**Semua PC harus di WiFi/LAN yang sama.**

## Auto-Start dengan systemd (Opsional)

Buat file `/etc/systemd/system/scan-wisuda.service`:

```ini
[Unit]
Description=Scan Wisuda Server
After=network.target

[Service]
Type=simple
User=towi
WorkingDirectory=/home/towi/scan-wisuda
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DB_PATH=./data/wisuda.db

[Install]
WantedBy=multi-user.target
```

Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable scan-wisuda
sudo systemctl start scan-wisuda
```

Cek status:

```bash
sudo systemctl status scan-wisuda
```

Log:
```bash
sudo journalctl -u scan-wisuda -f
```

---

# Deploy ke VPS (Akses via Internet)

> 📒 Catatan lengkap server produksi (cara SSH, perintah sehari-hari, ganti password,
> pulihkan backup, masalah & solusinya) ada di **[VPS.md](./VPS.md)**.

Semua perangkat scanner membuka `http://IP-VPS` (atau `https://domain`) dari browser.
Aplikasi berjalan sebagai layanan systemd di belakang **nginx**; port 3000 tidak dibuka ke internet.

> 💡 Saat menempel perintah ke terminal SSH, jalankan **satu baris per satu baris**.
> Blok panjang sering terpecah / ikut spasi di depan. Kalau muncul `>` terus-menerus, tekan **Ctrl+C**.

## 1. Paket dasar (sebagai root)

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential python3 nginx sqlite3 ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
timedatectl set-timezone Asia/Jakarta    # PENTING: jam laporan CSV memakai zona waktu server
```

Swap 2 GB (cadangan RAM saat build) & user khusus aplikasi:

```bash
[ -f /swapfile ] || (fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab)
id wisuda >/dev/null 2>&1 || adduser --disabled-password --gecos "" wisuda
```

## 2. Akses repo GitHub (privat) dengan deploy key

```bash
sudo -u wisuda mkdir -p -m 700 /home/wisuda/.ssh
sudo -u wisuda ssh-keygen -t ed25519 -C "vps-scan-wisuda" -f /home/wisuda/.ssh/id_ed25519 -N ""
cat /home/wisuda/.ssh/id_ed25519.pub
```

Tempel isinya di GitHub → repo → **Settings → Deploy keys → Add deploy key** (tanpa *write access*). Uji:

```bash
sudo -u wisuda ssh -o StrictHostKeyChecking=accept-new -T git@github.com
```

## 3. Unduh, pasang, build (sebagai user wisuda)

```bash
sudo -iu wisuda
git clone git@github.com:tantowiyyt/scan-wisuda.git
cd scan-wisuda
npm run install:all
npm run build
cp server/.env.example server/.env
nano server/.env
```

> ⚠️ **Jangan jalankan `npm run seed` di VPS** — seed menghapus semua data.
> Buat event dan import Excel lewat halaman **Events**.

Isi `server/.env`:

```
PORT=3000
DB_PATH=./data/wisuda.db
ADMIN_PASSWORD=<password-admin-yang-kuat>
SCANNER_PASSWORD=<password-untuk-operator>
RESET_PASSWORD=<password-reset-presensi>
TRUST_PROXY=1
HOST=127.0.0.1
```

| Login | Akses |
|-------|-------|
| `ADMIN_PASSWORD` | Semua: dashboard, events, import, cetak QR, laporan CSV, reset presensi |
| `SCANNER_PASSWORD` | Pilih event, scan, lihat daftar mahasiswa |

`TRUST_PROXY=1` wajib di belakang nginx (IP asli perangkat untuk kunci login per perangkat).
Ganti password = edit `.env` lalu `systemctl restart scan-wisuda`; sesi lama role itu otomatis logout.

## 4. Layanan systemd (sebagai root)

File layanan ada di repo (`deploy/scan-wisuda.service`):

```bash
exit    # kembali ke root
cp /home/wisuda/scan-wisuda/deploy/scan-wisuda.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now scan-wisuda
systemctl status scan-wisuda --no-pager | head -5     # harus: active (running)
curl -s localhost:3000/api/auth/me                     # harus: {"status":"success","data":null}
journalctl -u scan-wisuda -f                           # lihat log (Ctrl+C untuk keluar)
```

## 5. nginx + firewall (sebagai root)

```bash
cp /home/wisuda/scan-wisuda/deploy/nginx-scan-wisuda.conf /etc/nginx/sites-available/scan-wisuda
ln -sf /etc/nginx/sites-available/scan-wisuda /etc/nginx/sites-enabled/scan-wisuda
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

ufw allow OpenSSH        # DULU, agar SSH tidak terkunci
ufw allow 'Nginx Full'
ufw enable
```

Buka `http://IP-VPS` dari browser. Kalau timeout, buka **panel web penyedia VPS → Firewall / Security Group**
dan izinkan **TCP 80** (dan **443** untuk HTTPS).

## 6. HTTPS (opsional, butuh domain)

Tanpa domain aplikasi tetap jalan via `http://IP`, tetapi Service Worker tidak aktif
(mode offline tetap jalan selama tab tidak di-refresh). Dengan domain (A record → IP VPS):

```bash
sed -i 's/server_name _;/server_name domain-anda.com;/' /etc/nginx/sites-available/scan-wisuda
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d domain-anda.com
```

## 7. Backup database otomatis

Skrip `deploy/backup-db.sh` menyalin database ke `server/data/backups/` (aman walau server berjalan,
file > 7 hari dihapus). Pasang cron tiap 30 menit (sebagai root):

```bash
(crontab -u wisuda -l 2>/dev/null; echo "*/30 * * * * bash /home/wisuda/scan-wisuda/deploy/backup-db.sh >/dev/null 2>&1") | crontab -u wisuda -
sudo -u wisuda bash /home/wisuda/scan-wisuda/deploy/backup-db.sh    # uji sekali
ls /home/wisuda/scan-wisuda/server/data/backups/
```

Pulihkan backup: `systemctl stop scan-wisuda`, salin file backup menjadi `server/data/wisuda.db`
(hapus `wisuda.db-wal` & `wisuda.db-shm`), lalu `systemctl start scan-wisuda`.

Selama acara, download juga **Laporan CSV** berkala sebagai cadangan kedua.

## 8. Update aplikasi

```bash
sudo -iu wisuda
cd scan-wisuda && bash deploy.sh
exit
systemctl restart scan-wisuda
```

## Checklist hari H

- [ ] Login operator dicoba di semua perangkat scanner, tiap perangkat diberi **nama** berbeda
- [ ] Semua perangkat sudah membuka halaman **Scan** saat online (cek "Data offline" di panel kanan bawah)
- [ ] Gladi resik: scan beberapa undangan asli → lalu **Reset Presensi**
- [ ] Uji mode offline: matikan WiFi perangkat, scan, nyalakan lagi → "scan offline berhasil dikirim"
- [ ] Hotspot HP cadangan siap jika internet gedung putus
- [ ] Backup manual sebelum acara: `sudo -u wisuda bash /home/wisuda/scan-wisuda/deploy/backup-db.sh`
