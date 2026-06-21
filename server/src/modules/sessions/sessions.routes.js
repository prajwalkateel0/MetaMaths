const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// Get recent sessions — must be before /:id
router.get('/recent', asyncHandler(async (req, res) => {
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).end()
  const sessions = await prisma.session.findMany({
    where: { teacherId: req.user.sub },
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: { quiz: { select: { title: true } }, classroom: { select: { name: true } }, _count: { select: { answers: true } } }
  })
  res.json(sessions.map(s => ({ ...s, quizTitle: s.quiz?.title, classroomName: s.classroom?.name, studentCount: s._count.answers })))
}))

// Get session
router.get('/:id', asyncHandler(async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } }, _count: { select: { questions: true } } } },
      classroom: { select: { name: true, id: true } }
    }
  })
  if (!session) return res.status(404).json({ detail: 'Not found' })
  if (req.user.role === 'student' && session.status !== 'ended') {
    session.quiz.questions = session.quiz.questions.map(q => ({ ...q, correctAnswer: undefined }))
  }
  res.json({ ...session, quiz: { ...session.quiz, questionCount: session.quiz._count.questions } })
}))

// Get session results with full breakdown (teacher or student who participated)
router.get('/:id/results', asyncHandler(async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      classroom: { select: { name: true } },
      answers: { include: { student: { select: { id: true, displayName: true } }, question: true } }
    }
  })
  if (!session) return res.status(404).json({ detail: 'Not found' })

  // Build per-question breakdown
  const questionBreakdown = session.quiz.questions.map(q => {
    const qAnswers = session.answers.filter(a => a.questionId === q.id)
    const correct = qAnswers.filter(a => a.isCorrect).length
    const total = qAnswers.length
    // Option distribution for MCQ
    const optionCounts = {}
    if (q.questionType === 'mcq' && q.options) {
      q.options.forEach((_, i) => { optionCounts[i] = 0 })
      qAnswers.forEach(a => {
        const val = a.response?.value ?? a.response
        if (val !== undefined && val !== null) optionCounts[val] = (optionCounts[val] || 0) + 1
      })
    }
    return { question: q, total, correct, successRate: total ? Math.round((correct / total) * 100) : 0, optionCounts }
  })

  // Build leaderboard
  const studentTotals = {}
  session.answers.forEach(a => {
    if (!studentTotals[a.studentId]) studentTotals[a.studentId] = { studentId: a.studentId, displayName: a.student.displayName, totalPoints: 0, correct: 0, total: 0 }
    studentTotals[a.studentId].totalPoints += a.pointsAwarded || 0
    studentTotals[a.studentId].total++
    if (a.isCorrect) studentTotals[a.studentId].correct++
  })
  const leaderboard = Object.values(studentTotals)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((s, i) => ({ ...s, rank: i + 1, score: s.total ? Math.round((s.correct / s.total) * 100) : 0 }))

  // My answers (for student view)
  const myAnswers = session.answers
    .filter(a => a.studentId === req.user.sub)
    .map(a => ({ questionId: a.questionId, response: a.response, isCorrect: a.isCorrect, pointsAwarded: a.pointsAwarded }))

  res.json({
    session: { id: session.id, status: session.status, startedAt: session.startedAt, endedAt: session.endedAt },
    quiz: { title: session.quiz.title, topic: session.quiz.topic },
    classroom: session.classroom,
    questionBreakdown,
    leaderboard,
    myAnswers,
    totalStudents: leaderboard.length,
    avgScore: leaderboard.length ? Math.round(leaderboard.reduce((s, e) => s + e.score, 0) / leaderboard.length) : 0,
  })
}))

// Export session results as CSV
router.get('/:id/export/csv', asyncHandler(async (req, res) => {
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).end()
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      quiz: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      answers: { include: { student: { select: { displayName: true, email: true } }, question: { select: { prompt: true, points: true } } } }
    }
  })
  if (!session) return res.status(404).json({ detail: 'Not found' })

  const studentMap = {}
  session.answers.forEach(a => {
    if (!studentMap[a.studentId]) studentMap[a.studentId] = { name: a.student.displayName, email: a.student.email, answers: {}, total: 0, correct: 0 }
    studentMap[a.studentId].answers[a.questionId] = a.isCorrect ? 'correct' : 'incorrect'
    studentMap[a.studentId].total++
    if (a.isCorrect) studentMap[a.studentId].correct++
  })

  const headers = ['Student Name', 'Email', 'Score %', 'Correct', 'Total', ...session.quiz.questions.map((q, i) => `Q${i + 1}`)]
  const rows = Object.values(studentMap).map(s => [
    s.name, s.email,
    s.total ? Math.round((s.correct / s.total) * 100) : 0,
    s.correct, s.total,
    ...session.quiz.questions.map(q => s.answers[q.id] || 'no answer')
  ])

  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id.slice(0, 8)}.csv"`)
  res.send(csv)
}))

// Answer distribution for a specific question (for real-time teacher view)
router.get('/:id/questions/:qid/distribution', asyncHandler(async (req, res) => {
  const answers = await prisma.answer.findMany({
    where: { sessionId: req.params.id, questionId: req.params.qid },
    select: { response: true, isCorrect: true }
  })
  const dist = {}
  answers.forEach(a => {
    const val = String(a.response?.value ?? a.response ?? 'no answer')
    if (!dist[val]) dist[val] = { count: 0, correct: false }
    dist[val].count++
    dist[val].correct = a.isCorrect
  })
  res.json({ distribution: dist, total: answers.length, correct: answers.filter(a => a.isCorrect).length })
}))

// Submit answer (student)
router.post('/:id/answer', asyncHandler(async (req, res) => {
  const { questionId, response } = req.body
  const session = await prisma.session.findUnique({ where: { id: req.params.id }, include: { quiz: { include: { questions: true } } } })
  if (!session) return res.status(404).json({ detail: 'Session not found' })

  const question = session.quiz.questions.find(q => q.id === questionId)
  if (!question) return res.status(404).json({ detail: 'Question not found' })

  const isCorrect = checkAnswer(question, response)
  const pointsAwarded = isCorrect ? (question.points || 1) : 0

  await prisma.answer.upsert({
    where: { sessionId_questionId_studentId: { sessionId: req.params.id, questionId, studentId: req.user.sub } },
    create: { sessionId: req.params.id, questionId, studentId: req.user.sub, response: { value: response }, isCorrect, pointsAwarded },
    update: { response: { value: response }, isCorrect, pointsAwarded }
  })

  // Check for badges
  const badges = await checkAndAwardBadges(req.user.sub, isCorrect, req.params.id)

  res.json({ accepted: true, isCorrect, pointsAwarded, newBadges: badges })
}))

// Teacher control
router.post('/:id/control', asyncHandler(async (req, res) => {
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).end()
  const { action } = req.body
  const session = await prisma.session.findUnique({ where: { id: req.params.id } })
  if (!session) return res.status(404).json({ detail: 'Not found' })

  const updates = {}
  switch (action) {
    case 'begin': updates.status = 'active'; updates.startedAt = new Date(); break
    case 'pause': updates.status = 'paused'; break
    case 'resume': updates.status = 'active'; break
    case 'next': updates.currentQuestionIndex = session.currentQuestionIndex + 1; break
    case 'end': updates.status = 'ended'; updates.endedAt = new Date(); break
  }
  const updated = await prisma.session.update({ where: { id: req.params.id }, data: updates })
  res.json(updated)
}))

// Badge definitions
const BADGES = [
  { id: 'first_answer', name: 'First Step', emoji: '🎯', description: 'Submitted your first answer', condition: (stats) => stats.totalAnswers === 1 },
  { id: 'perfect_session', name: 'Perfect Score', emoji: '🏆', description: 'Got 100% in a session', condition: (stats) => stats.sessionScore === 100 },
  { id: 'streak_3', name: 'On Fire', emoji: '🔥', description: '3 correct answers in a row', condition: (stats) => stats.streak >= 3 },
  { id: 'streak_5', name: 'Unstoppable', emoji: '⚡', description: '5 correct answers in a row', condition: (stats) => stats.streak >= 5 },
  { id: 'sessions_5', name: 'Regular', emoji: '📚', description: 'Participated in 5 sessions', condition: (stats) => stats.totalSessions >= 5 },
  { id: 'top_3', name: 'Podium', emoji: '🥉', description: 'Finished in top 3 of a session', condition: (stats) => stats.rank <= 3 && stats.rank > 0 },
  { id: 'first_place', name: 'Champion', emoji: '🥇', description: 'Finished 1st in a session', condition: (stats) => stats.rank === 1 },
]

async function checkAndAwardBadges(studentId, isCorrect, sessionId) {
  // Lightweight badge check — production would persist these
  const answers = await prisma.answer.findMany({ where: { studentId }, orderBy: { submittedAt: 'desc' } })
  const streak = getStreak(answers)
  const totalAnswers = answers.length
  const totalSessions = new Set(answers.map(a => a.sessionId)).size
  const stats = { totalAnswers, streak, totalSessions, sessionScore: 0, rank: 0 }

  const earned = []
  for (const badge of BADGES) {
    if (badge.condition(stats)) earned.push({ id: badge.id, name: badge.name, emoji: badge.emoji, description: badge.description })
  }
  return earned.slice(0, 1) // Return at most 1 new badge per answer
}

function getStreak(answers) {
  let streak = 0
  for (const a of answers) {
    if (a.isCorrect) streak++
    else break
  }
  return streak
}

function checkAnswer(question, response) {
  const correct = question.correctAnswer
  const val = response?.value ?? response
  if (question.questionType === 'numeric') {
    const tolerance = question.tolerance ?? 0.01
    return Math.abs(+val - +correct) <= tolerance
  }
  if (question.questionType === 'mcq') return +val === +correct
  if (question.questionType === 'true_false') return String(val).toLowerCase() === String(correct).toLowerCase()
  if (['short_answer', 'fill_blank'].includes(question.questionType)) {
    const expected = String(correct).toLowerCase().split(',').map(s => s.trim())
    return expected.includes(String(val).toLowerCase().trim())
  }
  return false
}

module.exports = router
