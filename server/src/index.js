require('dotenv').config()

// Prisma/PostgreSQL can return BigInt for large integer fields.
// JSON.stringify throws on BigInt — convert to Number globally.
BigInt.prototype.toJSON = function () { return Number(this) }

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const { port, frontendUrl } = require('./config')
const { errorHandler } = require('./middleware/errorHandler')

// Routes
const authRoutes = require('./modules/auth/auth.routes')
const datasetsRoutes = require('./modules/datasets/datasets.routes')
const chartsRoutes = require('./modules/charts/charts.routes')
const quizzesRoutes = require('./modules/quizzes/quizzes.routes')
const llmRoutes = require('./modules/quizzes/llm.routes')
const classroomsRoutes = require('./modules/classrooms/classrooms.routes')
const sessionsRoutes = require('./modules/sessions/sessions.routes')
const analyticsRoutes = require('./modules/analytics/analytics.routes')
const adminRoutes = require('./modules/admin/admin.routes')
const { router: notificationsRoutes } = require('./modules/notifications/notifications.routes')
const setupSocket = require('./realtime/socket')
const { verifyConnection } = require('./integrations/email')

const app = express()
const server = http.createServer(app)

// Socket.IO
const io = new Server(server, {
  cors: { origin: frontendUrl, credentials: true },
  transports: ['websocket', 'polling'],
})
setupSocket(io)

// Middleware
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: frontendUrl, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false })
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, message: { detail: 'Too many auth attempts' } })
app.use(globalLimiter)

// Health
app.get('/healthz', (_, res) => res.json({ status: 'ok' }))
app.get('/readyz', async (_, res) => {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ready', db: 'ok' })
  } catch {
    res.status(503).json({ status: 'not ready', db: 'error' })
  }
})

// API routes
const API = '/api/v1'
app.use(`${API}/auth`, authLimiter, authRoutes)
app.use(`${API}/datasets`, datasetsRoutes)
app.use(`${API}/charts`, chartsRoutes)
app.use(`${API}/quizzes`, quizzesRoutes)
app.use(`${API}/quizzes/llm`, llmRoutes)
app.use(`${API}/classrooms`, classroomsRoutes)
app.use(`${API}/sessions`, sessionsRoutes)
app.use(`${API}/analytics`, analyticsRoutes)
app.use(`${API}/admin`, adminRoutes)
app.use(`${API}/users`, require('./modules/users/users.routes'))
app.use(`${API}/notifications`, notificationsRoutes)

// 404
app.use((req, res) => res.status(404).json({ status: 404, title: 'Not Found', detail: `${req.method} ${req.path} not found` }))

// Error handler (must be last)
app.use(errorHandler)

server.listen(port, () => {
  console.log(`MetaMaths API running on http://localhost:${port}`)
  console.log(`WebSocket ready at ws://localhost:${port}/sessions`)
  verifyConnection()
})

module.exports = { app, server }
