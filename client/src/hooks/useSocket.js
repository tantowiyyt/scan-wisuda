/**
 * useSocket - Custom hook untuk koneksi Socket.IO yang reusable.
 *
 * Contoh penggunaan:
 *   const { status } = useSocket('attendance_update', (data) => {
 *     console.log('Update:', data)
 *   })
 */

import { io } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react'

export default function useSocket(eventName, callback) {
  const socketRef = useRef(null)
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    // Ambil URL server dari env variable, fallback ke localhost
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

    // Buat koneksi socket baru
    socketRef.current = io(url, { transports: ['websocket', 'polling'] })

    // Pantau status koneksi
    socketRef.current.on('connect', () => setStatus('connected'))
    socketRef.current.on('disconnect', () => setStatus('disconnected'))

    // Dengarkan event yang diminta
    socketRef.current.on(eventName, callback)

    // Cleanup: lepas listener, putuskan koneksi, kosongkan ref
    return () => {
      socketRef.current.off(eventName, callback)
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [eventName, callback])

  return { status }
}
