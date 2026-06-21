const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const authService = require('./auth.service')

const router = express.Router()

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, displayName, role } = req.body
  if (!email || !password || !displayName) return res.status(400).json({ detail: 'Missing required fields' })
  const user = await authService.register({ email, password, displayName, role })
  res.status(201).json({ userId: user.id })
}))

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const result = await authService.login({ email, password, userAgent: req.headers['user-agent'], ip: req.ip })
  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({ accessToken: result.accessToken, user: result.user })
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken
  const result = await authService.refresh(token)
  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 })
  res.json({ accessToken: result.accessToken })
}))

router.post('/logout', asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refreshToken)
  res.clearCookie('refreshToken')
  res.status(204).end()
}))

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.sub)
  res.json(user)
}))

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body
  if (email) await authService.forgotPassword(email)
  res.status(202).json({ message: 'If that email exists, a reset link was sent.' })
}))

router.get('/verify', asyncHandler(async (req, res) => {
  // In production: verify email token
  res.json({ verified: true })
}))

module.exports = router
