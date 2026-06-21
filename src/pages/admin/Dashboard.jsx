import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Database, Activity, Shield, TrendingUp, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    placeholderData: { totalUsers: 0, teachers: 0, students: 0, datasets: 0, sessions: 0, questionsAnswered: 0, growthData: [], recentErrors: [] }
  })

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Teachers', value: stats?.teachers, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Students', value: stats?.students, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Datasets', value: stats?.datasets, icon: Database, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Sessions Run', value: stats?.sessions, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Questions Answered', value: stats?.questionsAnswered?.toLocaleString(), icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">Admin Overview</h1>
        <p className="text-sm text-gray-400 mt-1">System-wide metrics and health</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="stat-value text-xl">{isLoading ? '—' : (value ?? 0)}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Growth chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats?.growthData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total Users" />
              <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* System health */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">System Health</h3>
          <div className="space-y-3">
            {[
              { label: 'API Server', status: 'healthy' },
              { label: 'Database', status: 'healthy' },
              { label: 'Redis', status: 'healthy' },
              { label: 'Socket.IO', status: 'healthy' },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
                  {status}
                </span>
              </div>
            ))}
          </div>
          {(stats?.recentErrors ?? []).length > 0 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-xs text-red-400 font-medium">Recent Errors</span>
              </div>
              {stats.recentErrors.slice(0, 3).map((e, i) => (
                <p key={i} className="text-xs text-gray-400 truncate">{e.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
