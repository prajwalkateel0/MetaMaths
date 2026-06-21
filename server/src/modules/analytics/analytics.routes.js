const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// Student analytics (own)
router.get('/student/me', asyncHandler(async (req, res) => {
  const studentId = req.user.sub
  const answers = await prisma.answer.findMany({ where: { studentId }, include: { session: { include: { quiz: { select: { topic: true, title: true } }, classroom: { select: { name: true } } } }, question: { select: { points: true } } } })
  const sessions = await prisma.session.findMany({ where: { status: 'ended' }, include: { quiz: { select: { title: true } }, classroom: { select: { name: true } }, answers: { where: { studentId } } } })

  const totalPoints = answers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0)
  const totalAnswered = answers.length
  const correct = answers.filter(a => a.isCorrect).length
  const avgScore = totalAnswered ? Math.round((correct / totalAnswered) * 100) : 0

  const memberships = await prisma.classroomMember.count({ where: { studentId, status: 'active' } })

  const topicMap = {}
  answers.forEach(a => {
    const topic = a.session?.quiz?.topic || 'general'
    if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0 }
    topicMap[topic].total++
    if (a.isCorrect) topicMap[topic].correct++
  })
  const topicBreakdown = Object.entries(topicMap).map(([topic, { total, correct }]) => ({ topic, score: Math.round((correct / total) * 100) }))
  const weakTopics = topicBreakdown.filter(t => t.score < 60).map(t => t.topic)

  const sessionHistory = sessions
    .filter(s => s.answers.length > 0)
    .map(s => {
      const pts = s.answers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0)
      const maxPts = s.answers.length
      return { id: s.id, quizTitle: s.quiz.title, classroomName: s.classroom.name, score: maxPts ? Math.round((pts / maxPts) * 100) : 0, date: s.startedAt }
    }).sort((a, b) => new Date(b.date) - new Date(a.date))

  const scoreHistory = sessionHistory.slice(0, 10).map(s => ({ date: new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), score: s.score }))

  res.json({ totalPoints, classrooms: memberships, sessionsAttended: sessionHistory.length, avgScore, streak: 1, badges: [], topicBreakdown, weakTopics, sessions: sessionHistory, scoreHistory })
}))

// Teacher summary
router.get('/teacher/summary', asyncHandler(async (req, res) => {
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).end()
  const [datasets, charts, quizzes, classrooms] = await Promise.all([
    prisma.dataset.count({ where: { ownerId: req.user.sub } }),
    prisma.chart.count({ where: { ownerId: req.user.sub } }),
    prisma.quiz.count({ where: { ownerId: req.user.sub } }),
    prisma.classroom.count({ where: { teacherId: req.user.sub, isArchived: false } }),
  ])
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const sessionsThisWeek = await prisma.session.count({ where: { teacherId: req.user.sub, startedAt: { gte: weekAgo } } })
  const memberData = await prisma.classroomMember.findMany({ where: { classroom: { teacherId: req.user.sub } }, distinct: ['studentId'] })
  res.json({ datasets, charts, quizzes, classrooms, sessionsThisWeek, studentsTotal: memberData.length })
}))

// Classroom analytics
router.get('/classroom/:id', asyncHandler(async (req, res) => {
  const classroomId = req.params.id === 'all' ? undefined : req.params.id
  const where = classroomId ? { classroomId } : { classroom: { teacherId: req.user.sub } }

  const sessions = await prisma.session.findMany({
    where, include: { quiz: { select: { title: true } }, answers: { include: { student: { select: { displayName: true } } } } }
  })

  const totalStudents = new Set(sessions.flatMap(s => s.answers.map(a => a.studentId))).size
  const totalSessions = sessions.length
  const allAnswers = sessions.flatMap(s => s.answers)
  const correctAnswers = allAnswers.filter(a => a.isCorrect)
  const avgScore = allAnswers.length ? Math.round((correctAnswers.length / allAnswers.length) * 100) : 0

  const avgScoreByQuiz = sessions.map(s => {
    const ans = s.answers
    const pct = ans.length ? Math.round((ans.filter(a => a.isCorrect).length / ans.length) * 100) : 0
    return { quizTitle: s.quiz.title.slice(0, 15), avgScore: pct }
  })

  // Student performance
  const studentMap = {}
  allAnswers.forEach(a => {
    if (!studentMap[a.studentId]) studentMap[a.studentId] = { displayName: a.student.displayName, total: 0, correct: 0, sessionCount: 0 }
    studentMap[a.studentId].total++
    if (a.isCorrect) studentMap[a.studentId].correct++
  })
  sessions.forEach(s => { s.answers.forEach(a => { if (studentMap[a.studentId]) studentMap[a.studentId].sessionCount++ }) })
  const studentPerformance = Object.entries(studentMap).map(([studentId, d]) => ({ studentId, displayName: d.displayName, avgScore: d.total ? Math.round((d.correct / d.total) * 100) : 0, sessionCount: new Set().size }))

  res.json({ totalStudents, totalSessions, avgScore, completionRate: 90, sessionsOverTime: [], avgScoreByQuiz, topicDifficulty: [], studentPerformance })
}))

// Admin stats
router.get('/admin/stats', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).end()
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

module.exports = router
