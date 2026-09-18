import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

// Socket singleton — dibuat sekali, dipakai semua komponen
let sharedSocket = null

function getSocket() {
  if (!sharedSocket) {
    // Di dev: Vite proxy /socket.io → localhost:3000
    // Di production: server serve client + socket.io di port sama
    const url = import.meta.env.VITE_SERVER_URL || ''
    sharedSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return sharedSocket
}

export default function useSocket(eventName, callback) {
  const callbackRef = useRef(callback)
  const [status, setStatus] = useState(
    sharedSocket?.connected ? 'connected' : 'disconnected'
  )

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const socket = getSocket()
    setStatus(socket.connected ? 'connected' : 'disconnected')

    const onConnect = () => setStatus('connected')
    const onDisconnect = () => setStatus('disconnected')
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    const handler = (...args) => {
      if (callbackRef.current) callbackRef.current(...args)
    }
    socket.on(eventName, handler)

    return () => {
      // JANGAN disconnect sharedSocket — biar tetap hidup antar route
      socket.off(eventName, handler)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [eventName])

  return { status }
}