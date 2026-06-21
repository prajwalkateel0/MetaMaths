import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Trophy, ChevronLeft, Download, Lightbulb } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import Leaderboard from '../../features/sessions/Leaderboard'

export default function StudentSessionReview() {
  const { id } = useParams()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['session-results', id],
    queryFn: () => api.get(`/sessions/${id}/results`).then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!data) return <div className="text-center py-20 text-gray-500">Session not found</div>

  const myAnswers = Object.fromEntries((data.myAnswers ?? []).map(a => [a.questionId, a]))
  const myRank = data.leaderboard.find(e => e.studentId === user?.id)
  const myScore = myRank?.score ?? 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/s/results" className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="section-title">Session Review</h1>
          <p className="text-sm text-gray-400">{data.quiz?.title} · {data.classroom?.name}</p>
        </div>
      </div>

      {/* My score */}
      <div className={`card border-2 text-center py-8 ${myScore >= 70 ? 'border-green-500/30' : myScore >= 50 ? 'border-yellow-500/30' : 'border-red-500/30'}`}>
        <div className="text-6xl font-black mb-2"
          style={{ color: myScore >= 70 ? '#10b981' : myScore >= 50 ? '#f59e0b' : '#ef4444' }}>
          {myScore}%
        </div>
        <p className="text-gray-400">
          {myRank ? `Rank #${myRank.rank} of ${data.totalStudents} students · ${myRank.totalPoints} pts` : 'Not ranked'}
        </p>
        <p className="text-2xl mt-2">
          {myScore >= 90 ? '🎉 Outstanding!' : myScore >= 70 ? '👍 Well done!' : myScore >= 50 ? '📈 Keep it up!' : '📚 Revise this topic!'}
        </p>
      </div>

      {/* Question-by-question review */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">Question Review</h2>
        {(data.questionBreakdown ?? []).map((qb, idx) => {
          const { question, successRate, optionCounts, total } = qb
          const myAnswer = myAnswers[question.id]
          const gotRight = myAnswer?.isCorrect

          return (
            <div key={question.id} className={`card border-l-4 ${gotRight ? 'border-l-green-500' : myAnswer ? 'border-l-red-500' : 'border-l-gray-700'}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xs bg-gray-800 rounded-lg px-2 py-1 text-gray-400 flex-shrink-0">Q{idx + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{question.prompt}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {gotRight ? <CheckCircle size={18} className="text-green-400" /> : myAnswer ? <XCircle size={18} className="text-red-400" /> : <span className="text-xs text-gray-500">skipped</span>}
                </div>
              </div>

              {/* Options breakdown for MCQ */}
              {question.questionType === 'mcq' && question.options && (
                <div className="space-y-1.5 mb-3">
                  {question.options.map((opt, i) => {
                    const cnt = optionCounts?.[i] ?? 0
                    const pct = total ? Math.round((cnt / total) * 100) : 0
                    const isCorrectOpt = i === question.correctAnswer
                    const iMyPick = myAnswer && (+( myAnswer.response?.value ?? myAnswer.response) === i)
                    return (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors
                        ${isCorrectOpt ? 'bg-green-500/10 border border-green-500/30' : iMyPick ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-800/50'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs
                          ${isCorrectOpt ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className={`flex-1 ${isCorrectOpt ? 'text-green-300 font-medium' : 'text-gray-400'}`}>{opt}</span>
                        {iMyPick && !isCorrectOpt && <span className="text-red-400 text-xs">your answer</span>}
                        {isCorrectOpt && <CheckCircle size={12} className="text-green-400" />}
                        <div className="w-16 bg-gray-700 rounded-full h-1.5 ml-2">
                          <div className={`h-1.5 rounded-full ${isCorrectOpt ? 'bg-green-500' : 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Non-MCQ answer reveal */}
              {question.questionType !== 'mcq' && (
                <div className="flex gap-4 text-xs mt-2">
                  {myAnswer && (
                    <div className={`px-3 py-1.5 rounded-lg ${gotRight ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                      Your answer: {String(myAnswer.response?.value ?? myAnswer.response)}
                    </div>
                  )}
                  <div className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-300">
                    Correct: {String(question.correctAnswer)}
                  </div>
                </div>
              )}

              {/* Class stats */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                <span>Class success rate: <span className={`font-medium ${successRate >= 70 ? 'text-green-400' : successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{successRate}%</span></span>
                <span>{total} students answered</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Leaderboard */}
      <Leaderboard entries={data.leaderboard} highlightId={user?.id} />

      <div className="flex gap-3">
        <Link to="/s/practice" className="btn-primary flex items-center gap-2">
          <Lightbulb size={14} /> Practice Weak Topics
        </Link>
        <Link to="/s/results" className="btn-outline">Back to Results</Link>
      </div>
    </div>
  )
}
