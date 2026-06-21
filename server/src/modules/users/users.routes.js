const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/me', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, email: true, role: true, displayName: true, avatarUrl: true, emailVerified: true, createdAt: true } })
  res.json(user)
}))

router.patch('/me', asyncHandler(async (req, res) => {
  const { displayName, email } = req.body
  const user = await prisma.user.update({ where: { id: req.user.sub }, data: { displayName, email }, select: { id: true, email: true, role: true, displayName: true } })
  res.json(user)
}))

router.patch('/me/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return res.status(400).json({ detail: 'Current password incorrect' })
  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: req.user.sub }, data: { passwordHash: hash } })
  res.json({ updated: true })
}))

module.exports = router
