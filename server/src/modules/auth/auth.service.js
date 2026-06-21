const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { PrismaClient } = require('@prisma/client')
const { jwt: jwtConfig } = require('../../config')
const { AppError } = require('../../middleware/errorHandler')
const email = require('../../integrations/email')

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 12

const generateTokens = (user) => {
  const payload = { sub: user.id, email: user.email, role: user.role, displayName: user.displayName }
  const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.accessExpiry })
  const refreshToken = uuidv4()
  return { accessToken, refreshToken }
}

const register = async ({ email: userEmail, password, displayName, role }) => {
  const existing = await prisma.user.findUnique({ where: { email: userEmail } })
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS')

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const verifyToken = uuidv4()

  const user = await prisma.user.create({
    data: { email: userEmail, passwordHash, displayName, role: role ?? 'student' }
  })

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'register', entityType: 'user', entityId: user.id }
  })

  // Send emails (non-blocking — don't fail registration if email fails)
  Promise.all([
    email.sendVerificationEmail(userEmail, displayName, verifyToken).catch(console.error),
    email.sendWelcomeEmail(userEmail, displayName, role ?? 'student').catch(console.error),
  ])

  return user
}

const login = async ({ email: userEmail, password, userAgent, ip }) => {
  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')

  const { accessToken, refreshToken } = generateTokens(user)
  const tokenHash = await bcrypt.hash(refreshToken, 10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt, userAgent, ip } })
  await prisma.auditLog.create({ data: { userId: user.id, action: 'login', entityType: 'user', ip } })

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName, avatarUrl: user.avatarUrl } }
}

const forgotPassword = async (userEmail) => {
  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) return // Silent — don't reveal existence

  const resetToken = uuidv4()
  // In production: store hashed token with expiry; for now send directly
  email.sendPasswordResetEmail(userEmail, user.displayName, resetToken).catch(console.error)
}

const refresh = async (refreshToken) => {
  if (!refreshToken) throw new AppError('No refresh token', 401)
  const tokens = await prisma.refreshToken.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } })
  let validToken = null
  for (const t of tokens) {
    const match = await bcrypt.compare(refreshToken, t.tokenHash)
    if (match) { validToken = t; break }
  }
  if (!validToken) throw new AppError('Invalid refresh token', 401)
  await prisma.refreshToken.update({ where: { id: validToken.id }, data: { revokedAt: new Date() } })

  const { accessToken, refreshToken: newRefresh } = generateTokens(validToken.user)
  const newHash = await bcrypt.hash(newRefresh, 10)
  await prisma.refreshToken.create({ data: { userId: validToken.userId, tokenHash: newHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })

  return { accessToken, refreshToken: newRefresh }
}

const logout = async (refreshToken) => {
  if (!refreshToken) return
  const tokens = await prisma.refreshToken.findMany({ where: { revokedAt: null } })
  for (const t of tokens) {
    const match = await bcrypt.compare(refreshToken, t.tokenHash)
    if (match) { await prisma.refreshToken.update({ where: { id: t.id }, data: { revokedAt: new Date() } }); break }
  }
}

const getMe = async (userId) => {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, displayName: true, avatarUrl: true, emailVerified: true, createdAt: true } })
}

module.exports = { register, login, forgotPassword, refresh, logout, getMe }
