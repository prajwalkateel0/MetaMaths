import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Target, Clock, BookOpen, CheckCircle, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { getModule } from '../../data/lessonModules'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
const tooltipStyle = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb', fontSize: '12px' }

function LessonChart({ module }) {
  const data = module.sampleData
  if (module.chartType === 'line') return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey={module.chartX} tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey={module.chartY} stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey={module.chartX} tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={module.chartY} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function StudentLessonView() {
  const { topic } = useParams()
  const module = getModule(topic)
  const [expandedQ, setExpandedQ] = useState(null)
  const [activeTab, setActiveTab] = useState('learn')

  if (!module) return (
    <div className="text-center py-20">
      <p className="text-gray-400">Lesson not found.</p>
      <Link to="/s/dashboard" className="btn-primary mt-4">Back to Dashboard</Link>
    </div>
  )

  const tabs = [
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'chart', label: 'Data & Chart', icon: BarChart3 },
    { id: 'practice', label: `Practice (${module.questions.length})`, icon: Target },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/s/classrooms" className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{module.icon}</span>
            <h1 className="text-xl font-bold text-white">{module.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {module.keyStage.map(ks => <span key={ks} className="badge-gray text-xs">{ks}</span>)}
            <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={10} /> {module.duration}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Learn tab */}
      {activeTab === 'learn' && (
        <div className="space-y-5">
          {/* What you'll learn */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Target size={14} className="text-green-400" /> What you'll learn
            </h2>
            <ul className="space-y-2">
              {module.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Esports context */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs font-semibold text-purple-400 mb-1">Why this matters in esports</p>
            <p className="text-sm text-gray-300">{module.esportsContext}</p>
          </div>

          {/* Worked example */}
          {module.workedExample && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3">Worked Example</h2>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3">
                <p className="text-sm text-blue-200 font-medium">{module.workedExample.question}</p>
              </div>
              <ol className="space-y-2">
                {module.workedExample.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Chart tab */}
      {activeTab === 'chart' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">{module.chartTitle || module.title}</h2>
            <LessonChart module={module} />
          </div>
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Data Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-800/60">
                    {Object.keys(module.sampleData[0]).map(k => (
                      <th key={k} className="px-3 py-2 text-left font-medium text-gray-400">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {module.sampleData.map((row, i) => (
                    <tr key={i} className="border-t border-gray-800/60">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-gray-300">{typeof v === 'number' ? v.toLocaleString() : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Practice tab */}
      {activeTab === 'practice' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Try these questions based on the chart above. Click to reveal answers.</p>
          {module.questions.map((q, idx) => {
            const open = expandedQ === idx
            const diffColor = { easy: 'badge-green', medium: 'badge-yellow', hard: 'badge-red' }
            return (
              <div key={idx} className="card border border-gray-800">
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpandedQ(open ? null : idx)}>
                  <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{q.prompt}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`badge text-xs ${diffColor[q.difficulty]}`}>{q.difficulty}</span>
                      <span className="badge-gray text-xs">{q.type}</span>
                      <span className="text-xs text-gray-500">{q.points}pt</span>
                    </div>
                  </div>
                  {open ? <ChevronUp size={14} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />}
                </div>
                {open && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm border ${i === q.answer ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-500'}`}>
                            <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                            <span>{opt}</span>
                            {i === q.answer && <CheckCircle size={11} className="text-green-400 ml-auto" />}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle size={14} className="text-green-400" />
                      <div>
                        <p className="text-xs text-gray-500">Answer</p>
                        <p className="text-green-300 font-bold">{q.type === 'mcq' ? q.options?.[q.answer] : q.answer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
