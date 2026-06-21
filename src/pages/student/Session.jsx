import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { connectSocket, disconnectSocket } from '../../lib/socket'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import api from '../../lib/api'
import LiveSessionStage from '../../features/sessions/LiveSessionStage'
import Leaderboard from '../../features/sessions/Leaderboard'
import BadgeCelebration from '../../features/gamification/BadgeCelebration'
import XPBar, { getLevel } from '../../features/gamification/XPBar'
import Spinner from '../../components/ui/Spinner'
import ChartRenderer from '../../features/charts/ChartRenderer'
import { Trophy, Users, Clock, BookOpen } from 'lucide-react'

export default function StudentSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const { toast } = useUIStore()

  const [socket, setSocket] = useState(null)
  const [newBadge, setNewBadge] = useState(null)
  const [sessionState, setSessionState] = useState('waiting')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [myScore, setMyScore] = useState(0)

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get(`/sessions/${id}`).then(r => r.data),
  })

  // Fetch chart data whenever the current question has a chart
  const chartConfig = currentQuestion?.chart?.config
  const { data: chartData } = useQuery({
    queryKey: ['session-chart', currentQuestion?.chartId],
    queryFn: () => api.post('/charts/preview', {
      datasetId: chartConfig?.datasetId,
      xField: chartConfig?.xField,
      yField: chartConfig?.yField,
      aggregation: chartConfig?.aggregation,
      seriesField: chartConfig?.seriesField,
    }).then(r => r.data),
    enabled: !!currentQuestion?.chartId && !!chartConfig?.datasetId && !!chartConfig?.xField && !!chartConfig?.yField,
    staleTime: 60_000,
  })

  useEffect(() => {
    const sock = connectSocket(accessToken)
    setSocket(sock)
    sock.emit('session:join', { sessionId: id })

    sock.on('session:state', (state) => {
      setSessionState(state.status)
      if (state.currentQuestion) setCurrentQuestion(state.currentQuestion)
    })
    sock.on('question:start', ({ question, timeLimit }) => {
      setCurrentQuestion(question)
      setTimeLeft(timeLimit)
      setAnswered(false)
      setLastResult(null)
      setSessionState('active')
    })
    sock.on('question:end', ({ correctAnswer, stats }) => {
      setCurrentQuestion(q => ({ ...q, revealed: true, correctAnswer }))
    })
    sock.on('answer:ack', ({ accepted, pointsAwarded, newBadges }) => {
      setLastResult({ accepted, pointsAwarded })
      setMyScore(s => s + (pointsAwarded ?? 0))
      if (newBadges?.length > 0) setNewBadge(newBadges[0])
    })
    sock.on('leaderboard:update', ({ top10 }) => setLeaderboard(top10 ?? []))
    sock.on('student:joined', ({ total }) => setStudentCount(total))
    sock.on('student:left', ({ total }) => setStudentCount(total))
    sock.on('session:ended', () => { setSessionEnded(true); setSessionState('ended') })

    return () => disconnectSocket()
  }, [id, accessToken])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const submitAnswer = (response) => {
    if (answered) return
    setAnswered(true)
    socket?.emit('answer:submit', { questionId: currentQuestion.id, response, sessionId: id })
  }

  if (!session) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  if (sessionEnded) {
    const myRank = leaderboard.findIndex(e => e.studentId === user?.id) + 1
    const pct = leaderboard.find(e => e.studentId === user?.id)
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <Trophy size={48} className="text-yellow-400 mx-auto" />
        <h1 className="text-3xl font-bold text-white">Session Complete!</h1>
        <p className="text-gray-400">You earned <span className="text-yellow-400 font-bold text-xl">{myScore} XP</span></p>
        {myRank > 0 && <p className="text-gray-400">Your rank: <span className="text-blue-400 font-bold">#{myRank}</span> of {leaderboard.length} students</p>}
        <XPBar xp={myScore * 10} />
        <Leaderboard entries={leaderboard} highlightId={user?.id} />
        <div className="flex gap-3 justify-center">
          <Link to={`/s/sessions/${id}/review`} className="btn-primary flex items-center gap-2">
            <BookOpen size={14} /> Review Answers
          </Link>
          <button onClick={() => navigate('/s/dashboard')} className="btn-outline">Dashboard</button>
        </div>
      </div>
    )
  }

  if (sessionState === 'waiting') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-20">
        <div className="w-16 h-16 rounded-full esport-gradient flex items-center justify-center mx-auto animate-pulse-slow">
          <Users size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Waiting for teacher to start...</h2>
        <p className="text-gray-400">{session.quiz?.title}</p>
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-2xl font-bold text-white">{studentCount}</p>
            <p className="text-xs text-gray-500">Students joined</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{session.quiz?.questionCount ?? '?'}</p>
            <p className="text-xs text-gray-500">Questions</p>
          </div>
        </div>
        <Spinner size="sm" className="mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BadgeCelebration badge={newBadge} onDismiss={() => setNewBadge(null)} />
      {/* Session header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{session.quiz?.title}</h2>
          <p className="text-xs text-gray-500">{studentCount} students · {myScore} pts earned</p>
        </div>
        {timeLeft > 0 && (
          <div className={`text-2xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </div>
        )}
      </div>

      {/* Chart panel — from linked chart (chartId) or embedded lesson data (dataReference) */}
      {currentQuestion?.chartId && (
        <div className="card p-4">
          {chartData?.length > 0 ? (
            <ChartRenderer
              config={{ ...chartConfig, chartType: currentQuestion.chart?.chartType ?? chartConfig?.chartType ?? 'bar' }}
              data={chartData}
            />
          ) : (
            <div className="flex justify-center py-6"><Spinner /></div>
          )}
        </div>
      )}
      {!currentQuestion?.chartId && currentQuestion?.dataReference?.chartData?.length > 0 && (
        <div className="card p-4">
          <ChartRenderer
            config={{
              chartType: currentQuestion.dataReference.chartType ?? 'bar',
              title: currentQuestion.dataReference.title,
              xLabel: currentQuestion.dataReference.xLabel,
              yLabel: currentQuestion.dataReference.yLabel,
            }}
            data={currentQuestion.dataReference.chartData}
          />
        </div>
      )}

      {currentQuestion && (
        <LiveSessionStage
          question={currentQuestion}
          answered={answered}
          lastResult={lastResult}
          onSubmit={submitAnswer}
          timeLeft={timeLeft}
        />
      )}

      <Leaderboard entries={leaderboard} highlightId={user?.id} compact />
    </div>
  )
}
