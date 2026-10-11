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

Semua PC scanner membuka `https://domain-anda` dari browser. Server berjalan di
belakang **nginx** (HTTPS) dan port 3000 **tidak** dibuka ke internet.

## 1. Install & clone

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git python3 build-essential nginx certbot python3-certbot-nginx sqlite3
git clone https://github.com/tantowiyyt/scan-wisuda.git
cd scan-wisuda
npm run install:all
npm run build
```

> ⚠️ **Jangan jalankan `npm run seed` di VPS** — seed menghapus semua data.
> Buat event dan import Excel lewat halaman **Events**.

## 2. Isi `server/.env`

```bash
cp server/.env.example server/.env
nano server/.env
```

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
| `ADMIN_PASSWORD` | Semua: events, import, cetak QR, laporan CSV, reset presensi |
| `SCANNER_PASSWORD` | Pilih event, scan, lihat daftar mahasiswa |

Ganti password = edit `.env` lalu restart server. Sesi lama untuk role itu otomatis logout.

## 3. systemd

`/etc/systemd/system/scan-wisuda.service` (sesuaikan `User` & path):

```ini
[Unit]
Description=Scan Wisuda Server
After=network.target

[Service]
Type=simple
User=<user-vps>
WorkingDirectory=/home/<user-vps>/scan-wisuda
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now scan-wisuda
sudo journalctl -u scan-wisuda -f    # lihat log
```

## 4. nginx + HTTPS

Arahkan DNS domain (A record) ke IP VPS, lalu buat `/etc/nginx/sites-available/scan-wisuda`:

```nginx
server {
    listen 80;
    server_name domain-anda.com;

    client_max_body_size 10m;   # upload Excel

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        # Wajib untuk Socket.IO (WebSocket)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scan-wisuda /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d domain-anda.com     # HTTPS gratis (Let's Encrypt)
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 5. Backup database

Backup harian (dan jalankan manual sebelum & sesudah acara):

```bash
mkdir -p ~/backup-wisuda
sqlite3 ~/scan-wisuda/server/data/wisuda.db ".backup '$HOME/backup-wisuda/wisuda-$(date +%F-%H%M).db'"
```

Selama acara, download **Laporan CSV** secara berkala sebagai cadangan.

## 6. Update aplikasi

```bash
cd ~/scan-wisuda
bash deploy.sh
sudo systemctl restart scan-wisuda
```

## Checklist hari H

- [ ] Login operator dicoba di semua perangkat scanner
- [ ] Gladi resik: scan beberapa undangan asli → lalu **Reset Presensi**
- [ ] Hotspot HP cadangan siap jika internet gedung putus
- [ ] Backup database sebelum acara dimulai
