import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, SkipForward, Square, Users, BarChart2, Trophy, BarChart, FileText } from 'lucide-react'
import { connectSocket, disconnectSocket } from '../../lib/socket'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import api from '../../lib/api'
import Leaderboard from '../../features/sessions/Leaderboard'
import AnswerDistribution from '../../features/sessions/AnswerDistribution'
import Spinner from '../../components/ui/Spinner'

export default function TeacherSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const { toast } = useUIStore()

  const [sessionState, setSessionState] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [connectedCount, setConnectedCount] = useState(0)
  const [currentStats, setCurrentStats] = useState({ answered: 0 })
  const [distribution, setDistribution] = useState({})
  const [socket, setSocket] = useState(null)
  const [revealedAnswer, setRevealedAnswer] = useState(false)

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get(`/sessions/${id}`).then(r => r.data),
  })

  useEffect(() => {
    const sock = connectSocket(accessToken)
    setSocket(sock)
    sock.emit('session:join', { sessionId: id })

    sock.on('session:state', (state) => setSessionState(state))
    sock.on('leaderboard:update', (data) => setLeaderboard(data.top10 ?? []))
    sock.on('student:joined', ({ total }) => setConnectedCount(total))
    sock.on('student:left', ({ total }) => setConnectedCount(total))
    sock.on('question:start', (data) => {
      setSessionState(s => ({ ...s, currentQuestion: data.question, status: 'active' }))
      setDistribution({})
      setRevealedAnswer(false)
    })
    sock.on('question:end', (data) => {
      setCurrentStats(s => ({ ...s, ...data.stats }))
      setRevealedAnswer(true)
    })
    sock.on('answer:distribution', (data) => setDistribution(data.distribution ?? {}))
    sock.on('session:ended', () => {
      setSessionState(s => ({ ...s, status: 'ended' }))
      toast.success('Session ended! View full results below.')
    })

    return () => disconnectSocket()
  }, [id, accessToken])

  // Poll answer distribution every 2s while active
  useEffect(() => {
    const currentQ = sessionState?.currentQuestion
    if (!currentQ || sessionState?.status !== 'active') return
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/sessions/${id}/questions/${currentQ.id}/distribution`)
        setDistribution(data.distribution ?? {})
        setCurrentStats({ answered: data.total })
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [sessionState?.currentQuestion?.id, sessionState?.status])

  const control = useCallback((action, extra = {}) => {
    socket?.emit('teacher:control', { action, sessionId: id, ...extra })
  }, [socket, id])

  if (!session) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const status = sessionState?.status ?? session?.status
  const currentQ = sessionState?.currentQuestion
  const qIndex = sessionState?.currentQuestionIndex ?? 0
  const totalQ = session?.quiz?.questionCount ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">{session.quiz?.title ?? 'Live Session'}</h1>
          <p className="text-sm text-gray-400">{session.classroom?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {status === 'ended' && (
            <Link to={`/t/sessions/${id}/results`} className="btn-secondary flex items-center gap-2 text-sm">
              <FileText size={14} /> Full Results
            </Link>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            ${status === 'active' ? 'bg-green-500/20 text-green-400' : status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
            <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-current'}`} />
            {status?.charAt(0).toUpperCase() + status?.slice(1)}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <Users size={20} className="text-blue-400 mb-2" />
          <div className="stat-value">{connectedCount}</div>
          <div className="stat-label">Students connected</div>
        </div>
        <div className="card">
          <BarChart2 size={20} className="text-purple-400 mb-2" />
          <div className="stat-value">{qIndex + 1}/{totalQ}</div>
          <div className="stat-label">Current question</div>
        </div>
        <div className="card">
          <Trophy size={20} className="text-yellow-400 mb-2" />
          <div className="stat-value">{currentStats.answered}/{connectedCount}</div>
          <div className="stat-label">Answered</div>
        </div>
      </div>

      {/* Current question + live distribution */}
      {currentQ && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Question card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-blue">Q{qIndex + 1}</span>
              <span className="badge-gray">{currentQ.questionType}</span>
              <span className="text-xs text-gray-500 ml-auto">{currentQ.timeLimitSec}s</span>
            </div>
            <p className="text-white font-medium mb-4">{currentQ.prompt}</p>

            {/* Options — teacher sees correct answer highlighted */}
            {currentQ.options && (
              <div className="space-y-2">
                {currentQ.options.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm
                    ${i === currentQ.correctAnswer ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-400'}`}>
                    <span className="font-mono text-xs w-4">{String.fromCharCode(65 + i)}.</span>
                    <span className="flex-1">{opt}</span>
                    {i === currentQ.correctAnswer && <span className="text-green-400 text-xs font-semibold">✓ correct</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live answer distribution */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart size={16} className="text-primary-400" />
              <h3 className="text-sm font-semibold text-white">Live Answer Distribution</h3>
              {status === 'active' && <span className="badge-green text-xs ml-auto animate-pulse">Live</span>}
            </div>
            <AnswerDistribution
              question={{ ...currentQ, revealed: revealedAnswer }}
              distribution={distribution}
              totalStudents={connectedCount}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Session Controls</h3>
        <div className="flex flex-wrap gap-3">
          {status === 'waiting' && (
            <button onClick={() => control('begin')} className="btn-primary flex items-center gap-2">
              <Play size={16} /> Begin Session
            </button>
          )}
          {status === 'active' && (
            <>
              <button onClick={() => control('next')} className="btn-primary flex items-center gap-2">
                <SkipForward size={16} /> Next Question
              </button>
              <button onClick={() => control('pause')} className="btn-secondary flex items-center gap-2">
                <Pause size={16} /> Pause
              </button>
            </>
          )}
          {status === 'paused' && (
            <button onClick={() => control('resume')} className="btn-primary flex items-center gap-2">
              <Play size={16} /> Resume
            </button>
          )}
          {status !== 'ended' && (
            <button onClick={() => control('end')} className="btn-danger flex items-center gap-2">
              <Square size={16} /> End Session
            </button>
          )}
          {status === 'ended' && (
            <Link to={`/t/sessions/${id}/results`} className="btn-primary flex items-center gap-2">
              <FileText size={16} /> View Full Results
            </Link>
          )}
        </div>
      </div>

      {/* Live leaderboard */}
      <Leaderboard entries={leaderboard} />
    </div>
  )
}
