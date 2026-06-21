import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CheckCircle, XCircle } from 'lucide-react'

export default function AnswerDistribution({ question, distribution = {}, totalStudents }) {
  if (!question) return null

  const isMCQ = question.questionType === 'mcq'
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F']

  const chartData = isMCQ
    ? (question.options ?? []).map((opt, i) => ({
        label: `${optionLabels[i]}. ${opt.slice(0, 20)}${opt.length > 20 ? '…' : ''}`,
        shortLabel: optionLabels[i],
        count: distribution[i]?.count ?? 0,
        isCorrect: i === question.correctAnswer,
      }))
    : Object.entries(distribution).map(([val, d]) => ({
        label: val,
        shortLabel: val,
        count: d.count,
        isCorrect: d.correct,
      }))

  const totalAnswered = Object.values(distribution).reduce((s, d) => s + (d.count ?? 0), 0)
  const correctCount = chartData.filter(d => d.isCorrect).reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20 flex-shrink-0">{totalAnswered}/{totalStudents} answered</span>
        <div className="flex-1 bg-gray-800 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${totalStudents ? (totalAnswered / totalStudents) * 100 : 0}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-300 w-12 text-right">
          {totalStudents ? Math.round((totalAnswered / totalStudents) * 100) : 0}%
        </span>
      </div>

      {/* Distribution chart */}
      {isMCQ ? (
        <div className="space-y-2">
          {chartData.map((d) => {
            const pct = totalAnswered ? Math.round((d.count / totalAnswered) * 100) : 0
            return (
              <div key={d.shortLabel} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${d.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                  {d.shortLabel}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="truncate max-w-xs">{d.label}</span>
                    <span className="ml-2 font-medium">{d.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-4 relative overflow-hidden">
                    <div
                      className={`h-4 rounded-full transition-all duration-700 ${d.isCorrect ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {d.isCorrect && <CheckCircle size={14} className="text-green-400 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isCorrect ? '#10b981' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Summary */}
      {totalAnswered > 0 && (
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle size={12} /> {correctCount} correct ({totalAnswered ? Math.round((correctCount / totalAnswered) * 100) : 0}%)
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <XCircle size={12} /> {totalAnswered - correctCount} incorrect
          </span>
        </div>
      )}
    </div>
  )
}
