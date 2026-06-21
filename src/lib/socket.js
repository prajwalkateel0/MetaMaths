import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => socket

export const connectSocket = (token) => {
  if (socket?.connected) return socket
  socket = io('/sessions', {
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
