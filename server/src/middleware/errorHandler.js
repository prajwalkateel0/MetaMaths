const { isProd } = require('../config')

class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500
  const title = err.code || (status >= 500 ? 'Internal Server Error' : 'Request Error')
  const detail = (isProd && status >= 500) ? 'An unexpected error occurred' : err.message

  if (status >= 500) console.error('[ERROR]', err)

  if (err.name === 'ZodError') {
    return res.status(400).json({
      type: 'validation-error', title: 'Validation Failed', status: 400,
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    })
  }

  res.status(status).json({ type: 'error', title, status, detail })
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

module.exports = { AppError, errorHandler, asyncHandler }
