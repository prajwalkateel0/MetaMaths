const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { requireTeacher } = require('../../middleware/rbac')
const { PrismaClient } = require('@prisma/client')
const { generateQuestions } = require('../../generators/questionGenerator')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// List quizzes
router.get('/', asyncHandler(async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true } } }
  })
  res.json(quizzes.map(q => ({ ...q, questionCount: q._count.questions })))
}))

// Get assigned quizzes for student
router.get('/assigned', asyncHandler(async (req, res) => {
  const memberships = await prisma.classroomMember.findMany({ where: { studentId: req.user.sub, status: 'active' }, select: { classroomId: true } })
  const classroomIds = memberships.map(m => m.classroomId)
  const sessions = await prisma.session.findMany({
    where: { classroomId: { in: classroomIds }, status: { in: ['waiting', 'active'] } },
    include: { quiz: { select: { title: true, _count: { select: { questions: true } } } }, classroom: { select: { name: true } } }
  })
  res.json(sessions.map(s => ({ sessionId: s.id, title: s.quiz.title, classroomName: s.classroom.name, questionCount: s.quiz._count.questions })))
}))

// Get single quiz
router.get('/:id', asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id }, include: { questions: { orderBy: { orderIndex: 'asc' } } } })
  if (!quiz) return res.status(404).json({ detail: 'Not found' })
  res.json(quiz)
}))

// Create quiz
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const { title, topic, difficulty, classroomId, questions: qs } = req.body
  const quiz = await prisma.quiz.create({ data: { ownerId: req.user.sub, title, topic, difficulty, classroomId } })
  if (qs?.length) {
    await prisma.question.createMany({ data: qs.map((q, i) => ({ ...q, quizId: quiz.id, id: undefined, orderIndex: i, chartId: q.chartId || null })) })
  }
  res.status(201).json(quiz)
}))

// Update quiz
router.patch('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } })
  if (!quiz || quiz.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  const { questions: qs, ...data } = req.body
  const updated = await prisma.quiz.update({ where: { id: req.params.id }, data })
  if (qs !== undefined) {
    await prisma.question.deleteMany({ where: { quizId: req.params.id } })
    if (qs.length) {
      await prisma.question.createMany({ data: qs.map((q, i) => ({ ...q, id: undefined, quizId: req.params.id, orderIndex: i, chartId: q.chartId || null })) })
    }
  }
  res.json(updated)
}))

// Publish quiz
router.post('/:id/publish', requireTeacher, asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } })
  if (!quiz || quiz.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  await prisma.quiz.update({ where: { id: req.params.id }, data: { status: 'published' } })
  res.json({ published: true })
}))

// Auto-generate questions
router.post('/:id/generate', requireTeacher, asyncHandler(async (req, res) => {
  const { datasetId, topic, difficulty, count } = req.body
  if (!datasetId) return res.status(400).json({ detail: 'datasetId required' })
  const questions = await generateQuestions({ datasetId, topic: topic || 'averages', difficulty: difficulty || 'medium', count: Math.min(count || 5, 20) })
  res.json({ questions })
}))

// Practice generate (no quiz ID needed)
router.post('/practice/generate', asyncHandler(async (req, res) => {
  const { datasetId, topic, difficulty, count } = req.body
  if (!datasetId) return res.status(400).json({ detail: 'datasetId required' })
  const questions = await generateQuestions({ datasetId, topic: topic || 'averages', difficulty: difficulty || 'medium', count: Math.min(count || 5, 10) })
  res.json({ questions })
}))

// Delete quiz
router.delete('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } })
  if (!quiz || quiz.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  await prisma.quiz.delete({ where: { id: req.params.id } })
  res.status(204).end()
}))

module.exports = router
