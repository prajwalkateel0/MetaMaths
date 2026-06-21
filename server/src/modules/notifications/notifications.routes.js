const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  res.json(notifications)
}))

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } })
  res.json({ read: true })
}))

router.post('/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.sub, readAt: null }, data: { readAt: new Date() } })
  res.json({ updated: true })
}))

// Helper to create a notification (used internally)
const createNotification = async (userId, type, payload) => {
  return prisma.notification.create({ data: { userId, type, payload } })
}

module.exports = { router, createNotification }
