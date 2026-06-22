import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => socket

// Same origin in dev (Vite proxies /socket.io); a different origin in
// production, so VITE_API_URL must point at the deployed backend.
const SOCKET_BASE = import.meta.env.VITE_API_URL || ''

export const connectSocket = (token) => {
  if (socket?.connected) return socket
  socket = io(`${SOCKET_BASE}/sessions`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })
  socket.on('connect_error', (err) => {
    console.error('Socket connect error:', err.message)
  })
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
