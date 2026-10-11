// Load server/.env lebih dulu dari modul lain (import ESM dievaluasi berurutan),
// apa pun working directory saat server dijalankan (root, server/, atau systemd)
import dotenv from 'dotenv'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = join(fileURLToPath(import.meta.url), '..')

dotenv.config({ path: join(__dirname, '.env') })
