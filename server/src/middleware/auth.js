const jwt = require('jsonwebtoken')
const { jwt: jwtConfig } = require('../config')

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ status: 401, title: 'Unauthorized', detail: 'No token provided' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, jwtConfig.secret)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ status: 401, title: 'Unauthorized', detail: 'Invalid or expired token' })
  }
}

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), jwtConfig.secret)
    } catch {}
  }
  next()
}

module.exports = { authMiddleware, optionalAuth }
