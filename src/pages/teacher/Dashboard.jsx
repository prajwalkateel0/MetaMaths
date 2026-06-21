import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Database, BarChart3, ClipboardList, Users, Plus, Play, TrendingUp, Clock } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'

const statColors = [
  'from-blue-600 to-primary-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-amber-600',
]

export default function TeacherDashboard() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get('/analytics/teacher/summary').then(r => r.data),
    placeholderData: { datasets: 0, charts: 0, quizzes: 0, classrooms: 0, studentsTotal: 0, sessionsThisWeek: 0 }
  })

  const { data: recentSessions } = useQuery({
    queryKey: ['recent-sessions'],
    queryFn: () => api.get('/sessions/recent').then(r => r.data),
    placeholderData: []
  })

  const statCards = [
    { label: 'Datasets', value: stats?.datasets ?? 0, icon: Database, href: '/t/datasets', color: statColors[0] },
    { label: 'Charts', value: stats?.charts ?? 0, icon: BarChart3, href: '/t/charts', color: statColors[1] },
    { label: 'Quizzes', value: stats?.quizzes ?? 0, icon: ClipboardList, href: '/t/quizzes', color: statColors[2] },
    { label: 'Classrooms', value: stats?.classrooms ?? 0, icon: Users, href: '/t/classrooms', color: statColors[3] },
  ]

  const quickActions = [
    { label: 'Import Dataset', href: '/t/datasets/new', icon: Database },
    { label: 'Build Chart', href: '/t/charts/builder', icon: BarChart3 },
    { label: 'New Quiz', href: '/t/quizzes/builder', icon: ClipboardList },
    { label: 'New Classroom', href: '/t/classrooms', icon: Users },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, {user?.displayName?.split(' ')[0]} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's an overview of your teaching activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} to={href} className="card-hover group">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <div className="stat-value">{isLoading ? '—' : value}</div>
            <div className="stat-label">{label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <Link key={label} to={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all group">
              <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-primary-500/20 flex items-center justify-center transition-colors">
                <Icon size={18} className="text-gray-400 group-hover:text-primary-400" />
              </div>
              <span className="text-xs text-gray-400 group-hover:text-gray-200 text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent sessions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Sessions</h2>
            <Link to="/t/classrooms" className="text-xs text-primary-400 hover:text-primary-300">View all</Link>
          </div>
          {recentSessions?.length === 0 ? (
            <div className="text-center py-8">
              <Play size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No sessions yet. Start one from a classroom!</p>
              <Link to="/t/classrooms" className="btn-primary mt-3 text-xs">Create Classroom</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {(recentSessions ?? []).slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{s.quizTitle}</p>
                    <p className="text-xs text-gray-500">{s.classroomName} · {s.studentCount} students</p>
                  </div>
                  <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats summary */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">This Week</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{stats?.sessionsThisWeek ?? 0}</p>
                <p className="text-xs text-gray-500">Sessions run</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{stats?.studentsTotal ?? 0}</p>
                <p className="text-xs text-gray-500">Total students across all classes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{stats?.avgSessionDuration ?? '—'}</p>
                <p className="text-xs text-gray-500">Avg session duration</p>
              </div>
            </div>
          </div>
          <Link to="/t/analytics" className="btn-outline w-full justify-center mt-6 text-xs">View Full Analytics</Link>
        </div>
      </div>
    </div>
  )
}
