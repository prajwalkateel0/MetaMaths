const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/rbac')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware, requireAdmin)

// List users
router.get('/users', asyncHandler(async (req, res) => {
  const { search = '', role = '' } = req.query
  const users = await prisma.user.findMany({
    where: {
      AND: [
        search ? { OR: [{ displayName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {},
        role ? { role } : {}
      ]
    },
    select: { id: true, email: true, displayName: true, role: true, isActive: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json(users)
}))

// Update user
router.patch('/users/:id', asyncHandler(async (req, res) => {
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: req.body, select: { id: true, email: true, role: true, isActive: true } })
  await prisma.auditLog.create({ data: { userId: req.user.sub, action: 'update', entityType: 'user', entityId: req.params.id } })
  res.json(updated)
}))

// Audit log
router.get('/audit', asyncHandler(async (req, res) => {
  const { search = '', action = '' } = req.query
  const logs = await prisma.auditLog.findMany({
    where: { action: action || undefined },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  })
  res.json(logs.map(l => ({ ...l, userEmail: l.user?.email })))
}))

// Admin stats (proxied to analytics)
router.get('/stats', asyncHandler(async (req, res) => {
  const [totalUsers, teachers, students, datasets, sessions, questionsAnswered] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'teacher' } }),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.dataset.count(),
    prisma.session.count(),
    prisma.answer.count(),
  ])
  res.json({ totalUsers, teachers, students, datasets, sessions, questionsAnswered, growthData: [], recentErrors: [] })
}))

// Data source config
router.post('/data-sources', asyncHandler(async (req, res) => {
  // Store encrypted in production; simplified here
  res.json({ saved: true })
}))

router.post('/data-sources/:source/test', asyncHandler(async (req, res) => {
  const fetch = require('node-fetch')
  if (req.params.source === 'opendota') {
    const r = await fetch('https://api.opendota.com/api/heroes')
    if (r.ok) return res.json({ ok: true, message: 'OpenDota reachable' })
  }
  res.json({ ok: false, message: 'Connection test failed' })
}))

module.exports = router
