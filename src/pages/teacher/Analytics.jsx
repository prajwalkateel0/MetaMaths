import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, ClipboardList, Award, Download } from 'lucide-react'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

export default function TeacherAnalytics() {
  const [classroomId, setClassroomId] = useState('')

  const { data: classrooms = [] } = useQuery({ queryKey: ['classrooms'], queryFn: () => api.get('/classrooms').then(r => r.data) })
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['classroom-analytics', classroomId],
    queryFn: () => api.get(`/analytics/classroom/${classroomId || 'all'}`).then(r => r.data),
    placeholderData: {
      sessionsOverTime: [],
      avgScoreByQuiz: [],
      topicDifficulty: [],
      studentPerformance: [],
      totalStudents: 0,
      totalSessions: 0,
      avgScore: 0,
      completionRate: 0,
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Analytics</h1>
        <div className="flex gap-3">
          <select value={classroomId} onChange={e => setClassroomId(e.target.value)} className="input text-sm w-48">
            <option value="">All classrooms</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-outline flex items-center gap-1.5 text-sm">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: analytics?.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Sessions Run', value: analytics?.totalSessions, icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Avg Score', value: analytics?.avgScore ? `${analytics.avgScore.toFixed(1)}%` : '—', icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Completion Rate', value: analytics?.completionRate ? `${analytics.completionRate.toFixed(0)}%` : '—', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="stat-value text-xl">{isLoading ? <Spinner size="sm" /> : value ?? '—'}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sessions over time */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Sessions Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analytics?.sessionsOverTime ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Avg score by quiz */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Average Score by Quiz</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics?.avgScoreByQuiz ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="quizTitle" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(v) => [`${v.toFixed(1)}%`, 'Avg Score']} />
              <Bar dataKey="avgScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Topic difficulty */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Topic Success Rates</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics?.topicDifficulty ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis dataKey="topic" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(v) => [`${v}%`, 'Success Rate']} />
              <Bar dataKey="successRate" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Student performance table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Student Performance</h3>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900">
                <tr>
                  <th className="text-left px-5 py-2 text-xs text-gray-500">Student</th>
                  <th className="text-right px-5 py-2 text-xs text-gray-500">Avg Score</th>
                  <th className="text-right px-5 py-2 text-xs text-gray-500">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.studentPerformance ?? []).map((s, i) => (
                  <tr key={s.studentId} className="border-t border-gray-800">
                    <td className="px-5 py-2 text-sm text-gray-200">{s.displayName}</td>
                    <td className="px-5 py-2 text-sm text-right">
                      <span className={`font-medium ${s.avgScore >= 70 ? 'text-green-400' : s.avgScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {s.avgScore?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-2 text-sm text-gray-400 text-right">{s.sessionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(analytics?.studentPerformance ?? []).length === 0 && (
              <p className="text-center text-sm text-gray-500 py-6">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
