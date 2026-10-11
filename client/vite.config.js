import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        // Backend mati → balas 502 (sama seperti nginx di production) agar client
        // masuk mode offline, bukan menganggapnya error server biasa (500)
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res.writeHead && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ status: 'error', message: 'Server tidak terjangkau' }))
            }
          })
        },
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
})