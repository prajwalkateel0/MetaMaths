import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Sparkles, Star, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'
import LiveSessionStage from '../../features/sessions/LiveSessionStage'

const TOPICS = ['averages', 'percentages', 'ratios', 'probability', 'comparison', 'trends']

export default function StudentPractice() {
  const { toast } = useUIStore()
  const [topic, setTopic] = useState('averages')
  const [difficulty, setDifficulty] = useState('medium')
  const [practiceMode, setPracticeMode] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
    placeholderData: []
  })

  const [datasetId, setDatasetId] = useState('')

  const generateMutation = useMutation({
    mutationFn: () => api.post('/quizzes/practice/generate', { topic, difficulty, count: 5, datasetId }),
    onSuccess: (res) => {
      setQuestions(res.data.questions)
      setCurrentIdx(0)
      setAnswered(false)
      setLastResult(null)
      setScore(0)
      setDone(false)
      setPracticeMode(true)
    },
    onError: () => toast.error('Failed to generate practice questions'),
  })

  const currentQ = questions[currentIdx]

  const handleAnswer = (response) => {
    if (answered) return
    setAnswered(true)
    const correct = JSON.stringify(response) === JSON.stringify(currentQ.correctAnswer)
    const pts = correct ? currentQ.points ?? 1 : 0
    setScore(s => s + pts)
    setLastResult({ accepted: true, pointsAwarded: pts, correct })
  }

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) { setDone(true); return }
    setCurrentIdx(i => i + 1)
    setAnswered(false)
    setLastResult(null)
  }

  if (done) {
    const pct = Math.round((score / questions.reduce((a, q) => a + (q.points ?? 1), 0)) * 100)
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <Star size={48} className="text-yellow-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Practice Complete!</h2>
        <p className="text-gray-400">You scored <span className="text-yellow-400 font-bold">{score} points</span> ({pct}%)</p>
        <p className={`text-lg font-semibold ${pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {pct >= 70 ? '🎉 Great job!' : pct >= 50 ? '👍 Good effort!' : '📚 Keep practising!'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => generateMutation.mutate()} className="btn-primary">
            <RefreshCw size={14} /> Practice Again
          </button>
          <button onClick={() => { setPracticeMode(false); setDone(false) }} className="btn-outline">
            Change Topic
          </button>
        </div>
      </div>
    )
  }

  if (practiceMode && currentQ) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="badge-purple capitalize">{topic}</span>
            <span className="badge-gray ml-2 capitalize">{difficulty}</span>
          </div>
          <div className="text-sm text-gray-400">
            Q{currentIdx + 1}/{questions.length} · {score} pts
          </div>
        </div>

        <LiveSessionStage
          question={currentQ}
          answered={answered}
          lastResult={lastResult}
          onSubmit={handleAnswer}
          timeLeft={0}
          practiceMode
        />

        {answered && (
          <button onClick={nextQuestion} className="btn-primary w-full">
            {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">Practice Mode</h1>
        <p className="text-sm text-gray-400 mt-1">Generate questions on any topic to revise at your own pace. Not graded!</p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Maths Topic</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TOPICS.map(t => (
              <button key={t} onClick={() => setTopic(t)}
                className={`py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all
                  ${topic === t ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
          <div className="flex gap-2">
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${difficulty === d ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Dataset (optional)</label>
          <select value={datasetId} onChange={e => setDatasetId(e.target.value)} className="input text-sm">
            <option value="">Any available dataset</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>

        <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
          className="btn-primary w-full text-base py-3">
          {generateMutation.isPending ? <><Spinner size="sm" /> Generating...</> : <><Sparkles size={18} /> Start Practice</>}
        </button>
      </div>
    </div>
  )
}
