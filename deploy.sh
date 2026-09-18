#!/bin/bash
# deploy.sh — Update aplikasi dari GitHub ke production

set -e

echo "📥 Pull update dari GitHub..."
git pull origin main

echo "📦 Install dependencies..."
npm run install:all

echo "🔨 Build client..."
npm run build

echo "✅ Selesai. Restart server dengan: npm start"