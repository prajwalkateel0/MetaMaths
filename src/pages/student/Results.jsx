import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Target, TrendingUp, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

export default function StudentResults() {
  const { data: results, isLoading } = useQuery({
    queryKey: ['my-results'],
    queryFn: () => api.get('/analytics/student/me').then(r => r.data),
    placeholderData: { sessions: [], weakTopics: [], strongTopics: [], scoreHistory: [] }
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="section-title">My Results</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Score history chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Score History</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={results?.scoreHistory ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(v) => [`${v}%`, 'Score']} />
              <Bar dataKey="score" fill="#3b82f6" radius={[3, 3, 0, 0]}
                className="[&>*]:transition-all"
                label={{ position: 'top', fontSize: 10, fill: '#9ca3af', formatter: (v) => `${v}%` }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Topic breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Topic Performance</h3>
          <div className="space-y-3">
            {(results?.topicBreakdown ?? []).map(t => (
              <div key={t.topic}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 capitalize">{t.topic}</span>
                  <span className={`font-medium ${t.score >= 70 ? 'text-green-400' : t.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {t.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${t.score >= 70 ? 'bg-green-500' : t.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${t.score}%` }} />
                </div>
              </div>
            ))}
            {(results?.topicBreakdown ?? []).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Weak topics */}
      {(results?.weakTopics ?? []).length > 0 && (
        <div className="card border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-yellow-400" />
            <h3 className="text-sm font-semibold text-yellow-300">Topics to Revise</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {results.weakTopics.map(t => <span key={t} className="badge-yellow capitalize">{t}</span>)}
          </div>
        </div>
      )}

      {/* Session history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Session History</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {(results?.sessions ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No sessions yet. Join a live session from your classroom!</p>
          ) : (
            results.sessions.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                  ${s.score >= 70 ? 'bg-green-500/10' : s.score >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                  <Trophy size={16} className={s.score >= 70 ? 'text-green-400' : s.score >= 50 ? 'text-yellow-400' : 'text-red-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{s.quizTitle}</p>
                  <p className="text-xs text-gray-500">{s.classroomName} · {new Date(s.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-base font-bold ${s.score >= 70 ? 'text-green-400' : s.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {s.score}%
                  </p>
                  <p className="text-xs text-gray-500">Rank #{s.rank ?? '?'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
