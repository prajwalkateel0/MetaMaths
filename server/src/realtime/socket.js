const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { jwt: jwtConfig } = require('../config')
const emailSvc = require('../integrations/email')

const prisma = new PrismaClient()

module.exports = (io) => {
  const sessionsNS = io.of('/sessions')

  // Auth middleware for socket connections
  sessionsNS.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      socket.user = jwt.verify(token, jwtConfig.secret)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  sessionsNS.on('connection', (socket) => {
    const { sub: userId, role, displayName } = socket.user

    socket.on('session:join', async ({ sessionId }) => {
      try {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { quiz: { include: { questions: { orderBy: { orderIndex: 'asc' }, include: { chart: true } } } } }
        })
        if (!session) return socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' })

        socket.join(`session:${sessionId}`)
        socket.currentSession = sessionId

        // Send current state
        const currentQ = session.quiz.questions[session.currentQuestionIndex]
        socket.emit('session:state', {
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          currentQuestion: currentQ ? sanitizeQuestion(currentQ, session.status === 'ended') : null,
        })

        // Notify others
        const room = sessionsNS.adapter.rooms?.get(`session:${sessionId}`)
        const count = room?.size ?? 1
        sessionsNS.to(`session:${sessionId}`).emit('student:joined', { name: displayName, total: count })

        // Send leaderboard
        const leaderboard = await getLeaderboard(sessionId)
        socket.emit('leaderboard:update', { top10: leaderboard })
      } catch (err) {
        socket.emit('error', { code: 'JOIN_FAILED', message: err.message })
      }
    })

    socket.on('session:leave', () => {
      if (socket.currentSession) {
        socket.leave(`session:${socket.currentSession}`)
        const room = sessionsNS.adapter.rooms?.get(`session:${socket.currentSession}`)
        sessionsNS.to(`session:${socket.currentSession}`).emit('student:left', { name: displayName, total: room?.size ?? 0 })
      }
    })

    socket.on('answer:submit', async ({ questionId, response, sessionId }) => {
      try {
        const sid = sessionId || socket.currentSession
        const session = await prisma.session.findUnique({ where: { id: sid }, include: { quiz: { include: { questions: { include: { chart: true } } } } } })
        if (!session || session.status !== 'active') return

        const question = session.quiz.questions.find(q => q.id === questionId)
        if (!question) return

        const isCorrect = checkAnswer(question, response)
        const pointsAwarded = isCorrect ? (question.points || 1) : 0

        await prisma.answer.upsert({
          where: { sessionId_questionId_studentId: { sessionId: sid, questionId, studentId: userId } },
          create: { sessionId: sid, questionId, studentId: userId, response: { value: response }, isCorrect, pointsAwarded },
          update: { response: { value: response }, isCorrect, pointsAwarded }
        })

        socket.emit('answer:ack', { accepted: true, pointsAwarded })

        // Update leaderboard
        const leaderboard = await getLeaderboard(sid)
        sessionsNS.to(`session:${sid}`).emit('leaderboard:update', { top10: leaderboard })
      } catch (err) {
        socket.emit('error', { code: 'ANSWER_FAILED', message: err.message })
      }
    })

    socket.on('teacher:control', async ({ action, sessionId }) => {
      if (!['teacher', 'admin'].includes(role)) return socket.emit('error', { code: 'FORBIDDEN' })
      try {
        const sid = sessionId || socket.currentSession
        const session = await prisma.session.findUnique({ where: { id: sid }, include: { quiz: { include: { questions: { orderBy: { orderIndex: 'asc' }, include: { chart: true } } } } } })
        if (!session) return

        const updates = {}
        switch (action) {
          case 'begin':
            updates.status = 'active'
            updates.startedAt = new Date()
            await prisma.session.update({ where: { id: sid }, data: updates })
            const firstQ = session.quiz.questions[0]
            if (firstQ) sessionsNS.to(`session:${sid}`).emit('question:start', { question: sanitizeQuestion(firstQ), timeLimit: firstQ.timeLimitSec || 30 })
            sessionsNS.to(`session:${sid}`).emit('session:state', { status: 'active', currentQuestionIndex: 0 })
            // Email all classroom students that session has started
            ;(async () => {
              try {
                const fullSession = await prisma.session.findUnique({ where: { id: sid }, include: { classroom: { include: { members: { where: { status: 'active' }, include: { student: { select: { email: true, displayName: true } } } } } }, quiz: { select: { title: true } } } })
                const joinLink = `${process.env.FRONTEND_URL}/s/sessions/${sid}`
                for (const m of fullSession?.classroom?.members ?? []) {
                  emailSvc.sendSessionStartEmail(m.student.email, m.student.displayName, fullSession.quiz.title, fullSession.classroom.name, joinLink).catch(() => {})
                }
              } catch {}
            })()
            break

          case 'next': {
            const nextIdx = session.currentQuestionIndex + 1
            const endStats = await getQuestionStats(sid, session.quiz.questions[session.currentQuestionIndex]?.id)
            sessionsNS.to(`session:${sid}`).emit('question:end', { correctAnswer: session.quiz.questions[session.currentQuestionIndex]?.correctAnswer, stats: endStats })
            if (nextIdx >= session.quiz.questions.length) {
              await prisma.session.update({ where: { id: sid }, data: { status: 'ended', endedAt: new Date() } })
              sessionsNS.to(`session:${sid}`).emit('session:ended')
            } else {
              await prisma.session.update({ where: { id: sid }, data: { currentQuestionIndex: nextIdx } })
              const nextQ = session.quiz.questions[nextIdx]
              sessionsNS.to(`session:${sid}`).emit('question:start', { question: sanitizeQuestion(nextQ), timeLimit: nextQ.timeLimitSec || 30 })
            }
            break
          }

          case 'pause':
            await prisma.session.update({ where: { id: sid }, data: { status: 'paused' } })
            sessionsNS.to(`session:${sid}`).emit('session:paused')
            break

          case 'resume':
            await prisma.session.update({ where: { id: sid }, data: { status: 'active' } })
            sessionsNS.to(`session:${sid}`).emit('session:resumed')
            break

          case 'end':
            await prisma.session.update({ where: { id: sid }, data: { status: 'ended', endedAt: new Date() } })
            sessionsNS.to(`session:${sid}`).emit('session:ended')
            // Email each student their results
            ;(async () => {
              try {
                const ended = await prisma.session.findUnique({ where: { id: sid }, include: { quiz: { select: { title: true } }, answers: { include: { student: { select: { email: true, displayName: true } } } } } })
                if (!ended) return
                // Build per-student score
                const studentMap = {}
                ended.answers.forEach(a => {
                  if (!studentMap[a.studentId]) studentMap[a.studentId] = { email: a.student.email, name: a.student.displayName, correct: 0, total: 0 }
                  studentMap[a.studentId].total++
                  if (a.isCorrect) studentMap[a.studentId].correct++
                })
                const entries = Object.values(studentMap).sort((a, b) => (b.correct / b.total) - (a.correct / a.total))
                for (let i = 0; i < entries.length; i++) {
                  const s = entries[i]
                  const score = s.total ? Math.round((s.correct / s.total) * 100) : 0
                  emailSvc.sendSessionResultsEmail(s.email, s.name, ended.quiz.title, score, i + 1, entries.length, sid).catch(() => {})
                }
              } catch {}
            })()
            break
        }
      } catch (err) {
        socket.emit('error', { code: 'CONTROL_FAILED', message: err.message })
      }
    })

    socket.on('disconnect', () => {
      if (socket.currentSession) {
        const room = sessionsNS.adapter.rooms?.get(`session:${socket.currentSession}`)
        sessionsNS.to(`session:${socket.currentSession}`).emit('student:left', { name: displayName, total: (room?.size ?? 1) - 1 })
      }
    })
  })
}

function sanitizeQuestion(q, showAnswer = false) {
  const sanitized = {
    id: q.id, questionType: q.questionType, prompt: q.prompt,
    options: q.options, points: q.points, timeLimitSec: q.timeLimitSec,
    chartId: q.chartId ?? null,
    chart: q.chart ? { chartType: q.chart.chartType, config: q.chart.config } : null,
    dataReference: q.dataReference ?? null,
  }
  if (showAnswer) sanitized.correctAnswer = q.correctAnswer
  return sanitized
}

async function getLeaderboard(sessionId) {
  const answers = await prisma.answer.findMany({
    where: { sessionId },
    include: { student: { select: { id: true, displayName: true } } }
  })
  const totals = {}
  answers.forEach(a => {
    if (!totals[a.studentId]) totals[a.studentId] = { studentId: a.studentId, displayName: a.student.displayName, totalPoints: 0 }
    totals[a.studentId].totalPoints += a.pointsAwarded || 0
  })
  return Object.values(totals).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10)
}

async function getQuestionStats(sessionId, questionId) {
  if (!questionId) return { answered: 0 }
  const count = await prisma.answer.count({ where: { sessionId, questionId } })
  return { answered: count }
}

function checkAnswer(question, response) {
  const correct = question.correctAnswer
  if (question.questionType === 'numeric') return Math.abs(+response - +correct) <= (question.tolerance ?? 0.01)
  if (question.questionType === 'mcq') return +response === +correct
  if (question.questionType === 'true_false') return String(response).toLowerCase() === String(correct).toLowerCase()
  if (['short_answer', 'fill_blank'].includes(question.questionType)) {
    const expected = String(correct).toLowerCase().split(',').map(s => s.trim())
    return expected.includes(String(response).toLowerCase().trim())
  }
  return false
}
