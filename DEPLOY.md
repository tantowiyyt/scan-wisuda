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