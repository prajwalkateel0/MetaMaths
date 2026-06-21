import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, Sparkles, Save, Trash2, GripVertical, ChevronDown, ChevronUp, Check, Wand2, BarChart3 } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import QuestionEditor from '../../features/quizzes/QuestionEditor'
import AIEnhancePanel from '../../features/quizzes/AIEnhancePanel'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

const TOPICS = ['averages', 'percentages', 'ratios', 'probability', 'comparison', 'trends', 'range_iqr']
const DIFFICULTIES = ['easy', 'medium', 'hard']

export default function QuizBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useUIStore()

  const [title, setTitle] = useState('New Quiz')
  const [topic, setTopic] = useState('averages')
  const [difficulty, setDifficulty] = useState('medium')
  const [classroomId, setClassroomId] = useState('')
  const [questions, setQuestions] = useState([])
  const [expandedQ, setExpandedQ] = useState(null)
  const [aiPanel, setAiPanel] = useState(null) // questionIndex showing AI panel
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateParams, setGenerateParams] = useState({ datasetId: searchParams.get('datasetId') ?? '', topic: 'averages', difficulty: 'medium', count: 5 })
  const [generating, setGenerating] = useState(false)

  const { data: existingQuiz } = useQuery({
    queryKey: ['quiz', id], queryFn: () => api.get(`/quizzes/${id}`).then(r => r.data), enabled: !!id
  })
  const { data: datasets = [] } = useQuery({ queryKey: ['datasets'], queryFn: () => api.get('/datasets').then(r => r.data) })
  const { data: classrooms = [] } = useQuery({ queryKey: ['classrooms'], queryFn: () => api.get('/classrooms').then(r => r.data) })
  const { data: charts = [] } = useQuery({ queryKey: ['charts'], queryFn: () => api.get('/charts').then(r => r.data) })

  useEffect(() => {
    if (existingQuiz) {
      setTitle(existingQuiz.title)
      setTopic(existingQuiz.topic ?? 'averages')
      setDifficulty(existingQuiz.difficulty ?? 'medium')
      setClassroomId(existingQuiz.classroomId ?? '')
      setQuestions(existingQuiz.questions ?? [])
    }
  }, [existingQuiz])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { title, topic, difficulty, classroomId: classroomId || null, questions }
      return id ? api.patch(`/quizzes/${id}`, payload) : api.post('/quizzes', payload)
    },
    onSuccess: (res) => {
      toast.success('Quiz saved!')
      qc.invalidateQueries(['quizzes'])
      if (!id) navigate(`/t/quizzes/builder/${res.data.id}`)
    },
    onError: () => toast.error('Save failed'),
  })

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/quizzes/${id}/publish`),
    onSuccess: () => { toast.success('Quiz published!'); qc.invalidateQueries(['quiz', id]) },
  })

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post(`/quizzes/${id ?? 'temp'}/generate`, generateParams)
      setQuestions(prev => [...prev, ...data.questions])
      setShowGenerateModal(false)
      toast.success(`Generated ${data.questions.length} questions!`)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const addBlankQuestion = () => {
    const newQ = { id: `new-${Date.now()}`, questionType: 'mcq', prompt: '', options: ['', '', '', ''], correctAnswer: 0, points: 1, timeLimitSec: 30 }
    setQuestions(prev => [...prev, newQ])
    setExpandedQ(newQ.id)
  }

  const updateQuestion = (idx, updates) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q))
  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="text-2xl font-bold text-white bg-transparent border-0 border-b border-transparent hover:border-gray-700 focus:border-primary-500 focus:outline-none w-full transition-colors" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGenerateModal(true)} className="btn-secondary flex items-center gap-1.5">
            <Sparkles size={14} /> Auto-Generate
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">
            {saveMutation.isPending ? <Spinner size="sm" /> : <><Save size={14} /> Save</>}
          </button>
          {id && existingQuiz?.status === 'draft' && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || questions.length === 0}
              className="btn-md bg-green-600 hover:bg-green-500 text-white">
              <Check size={14} /> Publish
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Quiz Settings</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Topic</label>
            <select value={topic} onChange={e => setTopic(e.target.value)} className="input text-sm">
              {TOPICS.map(t => <option key={t} value={t}>{t.replace('_', '/')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                    ${difficulty === d ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Classroom</label>
            <select value={classroomId} onChange={e => setClassroomId(e.target.value)} className="input text-sm">
              <option value="">No classroom</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">{questions.length} Question{questions.length !== 1 ? 's' : ''}</h3>
          <button onClick={addBlankQuestion} className="btn-ghost text-xs flex items-center gap-1">
            <Plus size={14} /> Add question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="border-2 border-dashed border-gray-800 rounded-xl p-12 text-center">
            <ClipboardList size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">No questions yet</p>
            <div className="flex gap-3 justify-center">
              <button onClick={addBlankQuestion} className="btn-secondary text-sm">Add manually</button>
              <button onClick={() => setShowGenerateModal(true)} className="btn-primary text-sm"><Sparkles size={14} /> Auto-generate</button>
            </div>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id ?? idx} className="card border border-gray-800">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedQ(expandedQ === (q.id ?? idx) ? null : (q.id ?? idx))}>
                <GripVertical size={16} className="text-gray-600 cursor-grab" />
                <span className="text-xs text-gray-500 font-mono w-6">Q{idx + 1}</span>
                <span className="flex-1 text-sm text-gray-200 truncate">{q.prompt || '(no prompt yet)'}</span>
                <span className="badge-gray text-xs">{q.questionType}</span>
                <span className="text-xs text-gray-500">{q.points}pt</span>
                <button onClick={(e) => { e.stopPropagation(); setAiPanel(aiPanel === idx ? null : idx) }}
                  className="p-1 text-purple-400 hover:text-purple-300" title="AI Enhance"><Wand2 size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); removeQuestion(idx) }} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
                {expandedQ === (q.id ?? idx) ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </div>
              {expandedQ === (q.id ?? idx) && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                  <QuestionEditor question={q} onChange={(updates) => updateQuestion(idx, updates)} />

                  {/* Link a chart to this question */}
                  <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                      <BarChart3 size={12} /> Link chart (shown to students during session)
                    </label>
                    <select
                      value={q.chartId ?? ''}
                      onChange={e => updateQuestion(idx, { chartId: e.target.value || null })}
                      className="input text-xs py-1.5">
                      <option value="">— No chart —</option>
                      {charts.map(c => (
                        <option key={c.id} value={c.id}>{c.title || c.chartType} {c.datasetTitle ? `· ${c.datasetTitle}` : ''}</option>
                      ))}
                    </select>
                    {q.chartId && <p className="text-xs text-green-400 mt-1.5">✓ Chart linked — students will see this graph above the question</p>}
                  </div>
                  {aiPanel === idx && (
                    <AIEnhancePanel
                      question={q}
                      onSelect={(newPrompt) => { updateQuestion(idx, { prompt: newPrompt }); setAiPanel(null) }}
                      onClose={() => setAiPanel(null)}
                    />
                  )}
                  {aiPanel !== idx && (
                    <button onClick={() => setAiPanel(idx)} className="btn-ghost text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5">
                      <Wand2 size={12} /> Enhance with AI
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Auto-generate modal */}
      <Modal open={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Auto-Generate Questions" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Dataset</label>
            <select value={generateParams.datasetId} onChange={e => setGenerateParams(p => ({ ...p, datasetId: e.target.value }))} className="input text-sm">
              <option value="">Select dataset...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Maths Topic</label>
            <select value={generateParams.topic} onChange={e => setGenerateParams(p => ({ ...p, topic: e.target.value }))} className="input text-sm">
              {TOPICS.map(t => <option key={t} value={t}>{t.replace('_', '/')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setGenerateParams(p => ({ ...p, difficulty: d }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize ${generateParams.difficulty === d ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Number of Questions: {generateParams.count}</label>
            <input type="range" min={3} max={20} value={generateParams.count}
              onChange={e => setGenerateParams(p => ({ ...p, count: +e.target.value }))} className="w-full" />
          </div>
          <button onClick={handleGenerate} disabled={generating || !generateParams.datasetId} className="btn-primary w-full">
            {generating ? <><Spinner size="sm" /> Generating...</> : <><Sparkles size={14} /> Generate {generateParams.count} Questions</>}
          </button>
        </div>
      </Modal>
    </div>
  )
}
