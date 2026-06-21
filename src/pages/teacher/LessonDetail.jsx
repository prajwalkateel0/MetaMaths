import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ChevronLeft, Target, Clock, BookOpen, Lightbulb, Play,
  CheckCircle, ChevronDown, ChevronUp, Sparkles, Download,
  BarChart3, HelpCircle, GraduationCap, Gamepad2
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { getModule } from '../../data/lessonModules'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

const tooltipStyle = {
  backgroundColor: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', color: '#e5e7eb', fontSize: '12px'
}

function ModuleChart({ module }) {
  const data = module.sampleData
  if (module.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={module.chartX} tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey={module.chartY} stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey={module.chartX} tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={module.chartY} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function QuestionCard({ q, idx, showAnswer, onToggle }) {
  const typeLabel = { mcq: 'MCQ', numeric: 'Numeric', true_false: 'True/False' }
  const diffColor = { easy: 'badge-green', medium: 'badge-yellow', hard: 'badge-red' }

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 cursor-pointer" onClick={onToggle}>
        <span className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 truncate">{q.prompt}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge text-xs ${diffColor[q.difficulty]}`}>{q.difficulty}</span>
          <span className="badge-gray text-xs">{typeLabel[q.type] ?? q.type}</span>
          <span className="text-xs text-gray-500">{q.points}pt</span>
          {showAnswer ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>
      {showAnswer && (
        <div className="px-4 py-4 bg-gray-900 border-t border-gray-800 space-y-3">
          <p className="text-sm text-gray-200 font-medium">{q.prompt}</p>
          {q.type === 'mcq' && q.options && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {q.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg text-sm border ${i === q.answer ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-400'}`}>
                  <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                  {i === q.answer && <CheckCircle size={12} className="text-green-400 ml-auto" />}
                </div>
              ))}
            </div>
          )}
          {q.type === 'numeric' && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle size={16} className="text-green-400" />
              <div>
                <p className="text-xs text-gray-500">Correct answer</p>
                <p className="text-green-300 font-bold text-lg">{q.answer}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LessonDetail() {
  const { topic } = useParams()
  const navigate = useNavigate()
  const { toast } = useUIStore()
  const module = getModule(topic)
  const [expandedQ, setExpandedQ] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [creatingQuiz, setCreatingQuiz] = useState(false)
  const [classroomId, setClassroomId] = useState('')

  if (!module) return (
    <div className="text-center py-20">
      <p className="text-gray-400">Lesson not found.</p>
      <Link to="/t/lessons" className="btn-primary mt-4">Back to Lessons</Link>
    </div>
  )

  const createQuizFromLesson = async () => {
    setCreatingQuiz(true)
    try {
      const quizData = {
        title: `${module.title} — Esports Lesson Quiz`,
        topic: module.id,
        difficulty: 'medium',
        classroomId: classroomId || null,
        questions: module.questions.map((q, i) => ({
          questionType: q.type,
          prompt: q.prompt,
          options: q.options || null,
          correctAnswer: q.answer,
          points: q.points,
          timeLimitSec: q.difficulty === 'easy' ? 45 : q.difficulty === 'medium' ? 30 : 20,
          generated: false,
          orderIndex: i,
          dataReference: {
            chartData: module.sampleData.map(d => ({ x: d[module.chartX], y: d[module.chartY] })),
            chartType: module.chartType,
            xLabel: module.chartX,
            yLabel: module.chartY,
            title: module.title,
          },
        }))
      }
      const { data } = await api.post('/quizzes', quizData)
      toast.success('Quiz created! Review and publish it.')
      navigate(`/t/quizzes/builder/${data.id}`)
    } catch {
      toast.error('Failed to create quiz')
    } finally {
      setCreatingQuiz(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'chart', label: 'Data & Chart', icon: BarChart3 },
    { id: 'questions', label: `Questions (${module.questions.length})`, icon: HelpCircle },
    { id: 'teaching', label: 'Teaching Notes', icon: GraduationCap },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/t/lessons" className="text-gray-400 hover:text-gray-200 mt-1"><ChevronLeft size={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{module.icon}</span>
            <h1 className="text-2xl font-bold text-white">{module.title}</h1>
          </div>
          <p className="text-gray-400 text-sm">{module.subtitle}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {module.keyStage.map(ks => <span key={ks} className="badge-blue text-xs">{ks}</span>)}
            <span className={`badge text-xs ${module.difficulty === 'Higher' ? 'badge-red' : 'badge-green'}`}>{module.difficulty}</span>
            <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={11} /> {module.duration}</span>
          </div>
        </div>
        {/* Quick action */}
        <button onClick={createQuizFromLesson} disabled={creatingQuiz}
          className="btn-primary flex items-center gap-2 flex-shrink-0">
          {creatingQuiz ? <Spinner size="sm" /> : <Play size={14} />}
          Create Quiz from Lesson
        </button>
      </div>

      {/* Gradient bar */}
      <div className={`h-1.5 rounded-full bg-gradient-to-r ${module.color}`} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
              ${activeTab === id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Learning objectives */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className={module.textColor} />
              <h3 className="font-semibold text-white">Learning Objectives</h3>
            </div>
            <ul className="space-y-3">
              {module.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle size={15} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Curriculum + Esports context */}
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white">Curriculum Alignment</h3>
              </div>
              <p className="text-sm text-gray-300">{module.curriculum}</p>
              <div className="flex gap-2 mt-3">
                {module.keyStage.map(ks => <span key={ks} className="badge-blue">{ks} Level</span>)}
              </div>
            </div>

            <div className="card border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Gamepad2 size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-300">Why Esports?</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{module.esportsContext}</p>
            </div>
          </div>

          {/* Worked example */}
          <div className="card md:col-span-2 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-yellow-400" />
              <h3 className="font-semibold text-yellow-300">Worked Example</h3>
            </div>
            <p className="text-sm font-medium text-gray-200 mb-4">{module.workedExample.question}</p>
            <div className="space-y-2">
              {module.workedExample.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center text-xs font-bold text-yellow-300 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-200 font-mono">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Data & Chart */}
      {activeTab === 'chart' && (
        <div className="space-y-6">
          {/* Main chart */}
          <div className="card">
            <h3 className="font-semibold text-white mb-1">{module.chartTitle}</h3>
            <p className="text-xs text-gray-500 mb-6">Sample esports data for this lesson — teachers can import live data from OpenDota or PandaScore</p>
            <ModuleChart module={module} />
          </div>

          {/* Data table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">Sample Dataset</h3>
              <p className="text-xs text-gray-500 mt-0.5">Use this data with the worked examples and questions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800/50">
                  <tr>
                    {Object.keys(module.sampleData[0]).map(k => (
                      <th key={k} className="px-4 py-2.5 text-left text-gray-400 font-medium capitalize">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {module.sampleData.map((row, i) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-2.5 text-gray-300">
                          {typeof val === 'number' ? val : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats summary */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Stats from Sample Data</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const nums = module.sampleData.map(r => r[module.chartY]).filter(v => typeof v === 'number')
                const mean = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
                const sorted = [...nums].sort((a, b) => a - b)
                const min = sorted[0], max = sorted[sorted.length - 1]
                const range = (max - min).toFixed(2)
                return [
                  { label: 'Mean', value: mean, color: 'text-blue-400' },
                  { label: 'Minimum', value: min, color: 'text-green-400' },
                  { label: 'Maximum', value: max, color: 'text-red-400' },
                  { label: 'Range', value: range, color: 'text-yellow-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 bg-gray-800 rounded-xl">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label} of {module.chartY.replace(/_/g, ' ')}</p>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Questions */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{module.questions.length} ready-made questions — click any to see the answer</p>
            </div>
            <button onClick={createQuizFromLesson} disabled={creatingQuiz}
              className="btn-primary flex items-center gap-2 text-sm">
              {creatingQuiz ? <Spinner size="sm" /> : <Sparkles size={14} />}
              Use All in a Quiz
            </button>
          </div>

          {/* Difficulty legend */}
          <div className="flex gap-4 p-3 bg-gray-800/50 rounded-xl text-xs">
            {[
              { label: 'Easy (1pt)', color: 'badge-green' },
              { label: 'Medium (2pts)', color: 'badge-yellow' },
              { label: 'Hard (3pts)', color: 'badge-red' },
            ].map(({ label, color }) => <span key={label} className={`badge ${color}`}>{label}</span>)}
          </div>

          {module.questions.map((q, i) => (
            <QuestionCard key={i} q={q} idx={i}
              showAnswer={expandedQ === i}
              onToggle={() => setExpandedQ(expandedQ === i ? null : i)} />
          ))}
        </div>
      )}

      {/* TAB: Teaching Notes */}
      {activeTab === 'teaching' && (
        <div className="space-y-6">
          {/* Teaching tips */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-yellow-400" />
              <h3 className="font-semibold text-white">Teaching Tips</h3>
            </div>
            <div className="space-y-3">
              {module.teachingTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <span className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson plan template */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={18} className="text-blue-400" />
              <h3 className="font-semibold text-white">Suggested Lesson Structure ({module.duration})</h3>
            </div>
            <div className="space-y-2">
              {[
                { time: '0–5 min', phase: 'Hook', desc: `Ask: "Which ${module.id === 'ratios' ? 'esports player' : 'hero/team'} do you think performs best?" — let students debate before showing data.` },
                { time: '5–15 min', phase: 'Direct Teaching', desc: `Introduce the ${module.title.toLowerCase()} concept using the worked example. Build from simple numbers to the esports data.` },
                { time: '15–30 min', phase: 'Guided Practice', desc: `Work through Questions 1–3 together. Students answer on mini-whiteboards or digitally via MetaMaths live session.` },
                { time: '30–45 min', phase: 'Independent Practice', desc: `Students attempt Questions 4–6 independently. Teacher circulates and checks understanding.` },
                { time: '45–55 min', phase: 'Live Session', desc: `Run a MetaMaths quiz session with the pre-built questions. Use the leaderboard to motivate engagement.` },
                { time: '55–60 min', phase: 'Plenary', desc: `Review class performance on each question. Discuss which question was hardest and why.` },
              ].map(({ time, phase, desc }, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="w-20 flex-shrink-0">
                    <span className="text-xs font-mono text-blue-400 font-bold">{time}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{phase}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Import live data tip */}
          <div className="card border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-300">Use Live Data Instead of Sample Data</h3>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              The sample data above is embedded for convenience, but you can import fresh data from OpenDota or PandaScore to make the lesson more current and engaging.
            </p>
            <Link to="/t/datasets/new" className="btn-secondary text-sm flex items-center gap-2 w-fit">
              Import Live Esports Data
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
