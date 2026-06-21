import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Star, Zap, BookOpen, TrendingUp, Target } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'

export default function StudentDashboard() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/analytics/student/me').then(r => r.data),
    placeholderData: { totalPoints: 0, classrooms: 0, sessionsAttended: 0, avgScore: 0, streak: 0, badges: [], scoreHistory: [] }
  })

  const { data: upcomingQuizzes = [] } = useQuery({
    queryKey: ['upcoming-quizzes'],
    queryFn: () => api.get('/quizzes/assigned').then(r => r.data),
    placeholderData: []
  })

  const statCards = [
    { label: 'Total XP', value: stats?.totalPoints?.toLocaleString() ?? '0', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Day Streak', value: `${stats?.streak ?? 0} 🔥`, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Avg Score', value: stats?.avgScore ? `${stats.avgScore.toFixed(1)}%` : '—', icon: Target, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Sessions Done', value: stats?.sessionsAttended ?? 0, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hi {user?.displayName?.split(' ')[0]}! 🎮</h1>
        <p className="text-gray-400 text-sm mt-1">Keep up the great work. Here's your progress.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="stat-value text-xl">{isLoading ? '—' : value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Score history */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Score History</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats?.scoreHistory ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(v) => [`${v}%`, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming quizzes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Assigned Quizzes</h2>
            <Link to="/s/classrooms" className="text-xs text-primary-400 hover:text-primary-300">View classes</Link>
          </div>
          {upcomingQuizzes.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No quizzes assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingQuizzes.slice(0, 4).map(q => (
                <Link key={q.id} to={`/s/sessions/${q.sessionId}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                    <BookOpen size={14} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{q.title}</p>
                    <p className="text-xs text-gray-500">{q.classroomName} · {q.questionCount} Qs</p>
                  </div>
                  {q.deadline && (
                    <span className="text-xs text-yellow-400">{new Date(q.deadline).toLocaleDateString()}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      {(stats?.badges ?? []).length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3">Badges Earned</h2>
          <div className="flex flex-wrap gap-3">
            {stats.badges.map((b, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                <span className="text-lg">{b.emoji}</span>
                <div>
                  <p className="text-xs font-medium text-gray-200">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/s/classrooms" className="card-hover flex items-center gap-3">
          <BookOpen size={20} className="text-primary-400" />
          <div>
            <p className="text-sm font-medium text-white">My Classes</p>
            <p className="text-xs text-gray-500">{stats?.classrooms ?? 0} enrolled</p>
          </div>
        </Link>
        <Link to="/s/practice" className="card-hover flex items-center gap-3">
          <Star size={20} className="text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-white">Practice Mode</p>
            <p className="text-xs text-gray-500">Revise on your own</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
