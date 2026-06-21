const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ status: 401, title: 'Unauthorized' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ status: 403, title: 'Forbidden', detail: `Requires role: ${roles.join(' or ')}` })
  }
  next()
}

const requireAdmin = requireRole('admin')
const requireTeacher = requireRole('teacher', 'admin')
const requireStudent = requireRole('student', 'teacher', 'admin')

module.exports = { requireRole, requireAdmin, requireTeacher, requireStudent }
