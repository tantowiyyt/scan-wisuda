/**
 * useScanner - Custom hook untuk menangkap input dari barcode scanner
 * mode HID Keyboard (karakter cepat + Enter di akhir).
 *
 * Contoh penggunaan di komponen:
 *   useScanner((code) => { console.log('Scanned:', code) })
 */

import { useEffect, useRef } from 'react'

export default function useScanner(onScan, timeout = 100) {
  // Buffer untuk menampung karakter yang masuk dari scanner
  const buffer = useRef('')
  // Timestamp keydown terakhir untuk mendeteksi kecepatan input
  const lastKeyTime = useRef(0)

  useEffect(() => {
    const handler = (e) => {
      // Abaikan ketikan di field input — field itu punya submit sendiri.
      // Tanpa ini, scan saat input manual fokus akan terkirim dua kali
      // (form submit + hook ini) dan tercatat sebagai "Masuk Kembali".
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
        buffer.current = ''
        return
      }

      const now = Date.now()

      // Jika jeda antar keystroke lebih dari timeout,
      // berarti bukan scanner (input manusia) atau scan baru
      if (now - lastKeyTime.current > timeout) {
        buffer.current = ''
      }

      lastKeyTime.current = now

      // Enter menandakan akhir scan
      if (e.key === 'Enter') {
        // Minimal 3 karakter agar dianggap scan valid
        if (buffer.current.length >= 3) {
          onScan(buffer.current)
        }
        buffer.current = ''
      }
      // Tambahkan karakter tunggal (bukan modifier seperti Shift/Ctrl)
      else if (e.key.length === 1) {
        buffer.current += e.key
      }
    }

    window.addEventListener('keydown', handler)

    // Cleanup listener saat unmount atau dependency berubah
    return () => window.removeEventListener('keydown', handler)
  }, [onScan, timeout])
}
