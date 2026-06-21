import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Download, BarChart2, Users, Trophy, CheckCircle, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'
import Leaderboard from '../../features/sessions/Leaderboard'

export default function TeacherSessionResults() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['session-results', id],
    queryFn: () => api.get(`/sessions/${id}/results`).then(r => r.data),
  })

  const exportCSV = () => { window.open(`/api/v1/sessions/${id}/export/csv`, '_blank') }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!data) return null

  const questionChartData = (data.questionBreakdown ?? []).map((qb, i) => ({
    name: `Q${i + 1}`,
    successRate: qb.successRate,
    total: qb.total,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/t/classrooms" className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></Link>
          <div>
            <h1 className="section-title">Session Results</h1>
            <p className="text-sm text-gray-400">{data.quiz?.title} · {data.classroom?.name}</p>
          </div>
        </div>
        <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Students', value: data.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Avg Score', value: `${data.avgScore}%`, icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Questions', value: data.questionBreakdown?.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: '1st Place', value: data.leaderboard[0]?.displayName ?? '—', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="stat-value text-xl">{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Question success rate chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Question Success Rates</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={questionChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              formatter={(v) => [`${v}%`, 'Success Rate']} />
            <Bar dataKey="successRate" radius={[4, 4, 0, 0]}>
              {questionChartData.map((d, i) => (
                <Cell key={i} fill={d.successRate >= 70 ? '#10b981' : d.successRate >= 50 ? '#f59e0b' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Question breakdown */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Per-Question Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
            {(data.questionBreakdown ?? []).map((qb, i) => (
              <div key={qb.question.id} className="px-5 py-3">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-xs text-gray-500 w-5 flex-shrink-0">Q{i + 1}</span>
                  <p className="text-xs text-gray-300 flex-1 line-clamp-2">{qb.question.prompt}</p>
                </div>
                <div className="flex items-center gap-2 ml-5">
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${qb.successRate >= 70 ? 'bg-green-500' : qb.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${qb.successRate}%` }} />
                  </div>
                  <span className={`text-xs font-medium w-12 text-right ${qb.successRate >= 70 ? 'text-green-400' : qb.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {qb.successRate}%
                  </span>
                  <span className="text-xs text-gray-600">({qb.total})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <Leaderboard entries={data.leaderboard} />
        </div>
      </div>
    </div>
  )
}
