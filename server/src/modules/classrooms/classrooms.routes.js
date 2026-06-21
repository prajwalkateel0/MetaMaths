const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { requireTeacher } = require('../../middleware/rbac')
const { PrismaClient } = require('@prisma/client')
const { v4: uuidv4 } = require('uuid')
const emailSvc = require('../../integrations/email')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

// List classrooms
router.get('/', asyncHandler(async (req, res) => {
  const user = req.user
  if (user.role === 'student') {
    const memberships = await prisma.classroomMember.findMany({
      where: { studentId: user.sub, status: 'active' },
      include: { classroom: { include: { teacher: { select: { displayName: true } }, _count: { select: { members: true } } } } }
    })
    return res.json(memberships.map(m => ({ ...m.classroom, teacherName: m.classroom.teacher.displayName, memberCount: m.classroom._count.members })))
  }
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId: user.sub, isArchived: false },
    include: { _count: { select: { members: true, sessions: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json(classrooms.map(c => ({ ...c, memberCount: c._count.members })))
}))

// Get classroom detail
router.get('/:id', asyncHandler(async (req, res) => {
  const classroom = await prisma.classroom.findUnique({
    where: { id: req.params.id },
    include: {
      teacher: { select: { displayName: true } },
      sessions: { orderBy: { startedAt: 'desc' }, take: 5, include: { quiz: { select: { title: true } }, _count: { select: { answers: true } } } }
    }
  })
  if (!classroom) return res.status(404).json({ detail: 'Not found' })
  res.json({ ...classroom, teacherName: classroom.teacher.displayName })
}))

// Create classroom
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const { name, keyStage, description, approvalRequired } = req.body
  let joinCode = genCode()
  // Ensure unique
  while (await prisma.classroom.findUnique({ where: { joinCode } })) joinCode = genCode()

  const classroom = await prisma.classroom.create({ data: { teacherId: req.user.sub, name, keyStage, description, joinCode, approvalRequired: approvalRequired ?? false } })
  res.status(201).json(classroom)
}))

// Join classroom (student)
router.post('/join', asyncHandler(async (req, res) => {
  const { code } = req.body
  const classroom = await prisma.classroom.findUnique({ where: { joinCode: code?.toUpperCase() } })
  if (!classroom) return res.status(404).json({ detail: 'Invalid join code' })
  if (classroom.isArchived) return res.status(400).json({ detail: 'Classroom is archived' })

  const existing = await prisma.classroomMember.findUnique({ where: { classroomId_studentId: { classroomId: classroom.id, studentId: req.user.sub } } })
  if (existing) return res.status(409).json({ detail: 'Already a member' })

  const student = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { displayName: true } })
  await prisma.classroomMember.create({ data: { classroomId: classroom.id, studentId: req.user.sub, status: classroom.approvalRequired ? 'pending' : 'active' } })

  // Notify teacher
  const teacher = await prisma.user.findUnique({ where: { id: classroom.teacherId }, select: { email: true, displayName: true } })
  if (teacher) {
    emailSvc.sendClassroomJoinedEmail(teacher.email, teacher.displayName, student?.displayName ?? 'A student', classroom.name).catch(console.error)
  }

  res.json({ joined: true, classroom })
}))

// Get members
router.get('/:id/members', asyncHandler(async (req, res) => {
  const members = await prisma.classroomMember.findMany({
    where: { classroomId: req.params.id },
    include: { student: { select: { id: true, displayName: true, email: true } } }
  })
  res.json(members.map(m => ({ ...m, studentId: m.student.id, displayName: m.student.displayName, email: m.student.email })))
}))

// Approve member
router.post('/:id/members/:userId/approve', requireTeacher, asyncHandler(async (req, res) => {
  await prisma.classroomMember.update({ where: { classroomId_studentId: { classroomId: req.params.id, studentId: req.params.userId } }, data: { status: 'active' } })
  res.json({ approved: true })
}))

// Remove member
router.delete('/:id/members/:userId', requireTeacher, asyncHandler(async (req, res) => {
  await prisma.classroomMember.update({ where: { classroomId_studentId: { classroomId: req.params.id, studentId: req.params.userId } }, data: { status: 'removed' } })
  res.status(204).end()
}))

// Start session
router.post('/:id/sessions', requireTeacher, asyncHandler(async (req, res) => {
  const { quizId, mode } = req.body
  const session = await prisma.session.create({
    data: { classroomId: req.params.id, quizId, teacherId: req.user.sub, status: 'waiting', mode: mode || 'live' }
  })
  // Async/homework mode — email students immediately
  if (mode === 'async') {
    ;(async () => {
      try {
        const teacher = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { displayName: true } })
        const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { title: true } })
        const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id }, include: { members: { where: { status: 'active' }, include: { student: { select: { email: true, displayName: true } } } } } })
        for (const m of classroom?.members ?? []) {
          emailSvc.sendQuizAssignedEmail(m.student.email, m.student.displayName, quiz?.title ?? 'Quiz', classroom.name, teacher?.displayName ?? 'Your teacher', null).catch(() => {})
        }
      } catch {}
    })()
  }
  res.status(201).json(session)
}))

// Delete classroom
router.delete('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } })
  if (!classroom || classroom.teacherId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  await prisma.classroom.update({ where: { id: req.params.id }, data: { isArchived: true } })
  res.status(204).end()
}))

// Get classroom charts (for students)
router.get('/:id/charts', asyncHandler(async (req, res) => {
  const charts = await prisma.classroomChart.findMany({
    where: { classroomId: req.params.id },
    include: { chart: true }
  })
  res.json(charts.map(c => c.chart))
}))

// Get classroom dashboard config
router.get('/:id/dashboard', asyncHandler(async (req, res) => {
  const classroom = await prisma.classroom.findUnique({
    where: { id: req.params.id },
    include: { charts: { include: { chart: { include: { dataset: { select: { title: true } } } } } } }
  })
  if (!classroom) return res.status(404).json({ detail: 'Not found' })
  res.json({
    config: classroom.dashboardConfig ?? {},
    charts: classroom.charts.map(cc => ({ ...cc.chart, datasetTitle: cc.chart.dataset?.title })),
  })
}))

// Save classroom dashboard config (teacher only)
router.patch('/:id/dashboard', requireTeacher, asyncHandler(async (req, res) => {
  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } })
  if (!classroom || classroom.teacherId !== req.user.sub) return res.status(403).json({ detail: 'Not authorised' })
  const updated = await prisma.classroom.update({
    where: { id: req.params.id },
    data: { dashboardConfig: req.body },
  })
  res.json(updated.dashboardConfig)
}))

// Share / unshare a chart with classroom
router.post('/:id/charts', requireTeacher, asyncHandler(async (req, res) => {
  const { chartId } = req.body
  if (!chartId) return res.status(400).json({ detail: 'chartId required' })
  await prisma.classroomChart.upsert({
    where: { classroomId_chartId: { classroomId: req.params.id, chartId } },
    update: {},
    create: { classroomId: req.params.id, chartId },
  })
  res.json({ shared: true })
}))

router.delete('/:id/charts/:chartId', requireTeacher, asyncHandler(async (req, res) => {
  await prisma.classroomChart.deleteMany({ where: { classroomId: req.params.id, chartId: req.params.chartId } })
  res.status(204).end()
}))

module.exports = router
