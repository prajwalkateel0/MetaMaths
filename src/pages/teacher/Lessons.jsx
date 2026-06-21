import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, Target, ChevronRight, Search, Filter } from 'lucide-react'
import { LESSON_MODULES } from '../../data/lessonModules'

const KS_FILTERS = ['All', 'KS3', 'KS4', 'KS5']
const DIFF_FILTERS = ['All', 'Foundation', 'Higher']

export default function Lessons() {
  const [search, setSearch] = useState('')
  const [ksFilter, setKsFilter] = useState('All')
  const [diffFilter, setDiffFilter] = useState('All')

  const filtered = LESSON_MODULES.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(search.toLowerCase())
    const matchKS = ksFilter === 'All' || m.keyStage.includes(ksFilter)
    const matchDiff = diffFilter === 'All' || m.difficulty === diffFilter
    return matchSearch && matchKS && matchDiff
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Lesson Modules</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ready-made maths lessons using esports data. Each module includes charts, worked examples, pre-built quiz questions and teaching tips.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Lesson Modules', value: LESSON_MODULES.length, color: 'text-blue-400' },
          { label: 'Pre-built Questions', value: LESSON_MODULES.reduce((s, m) => s + m.questions.length, 0), color: 'text-purple-400' },
          { label: 'Curriculum Topics', value: '7 Topics', color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-sm text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search lessons..." className="input pl-9" />
        </div>
        <div className="flex gap-2">
          {KS_FILTERS.map(f => (
            <button key={f} onClick={() => setKsFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${ksFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {DIFF_FILTERS.map(f => (
            <button key={f} onClick={() => setDiffFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${diffFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(module => (
          <Link key={module.id} to={`/t/lessons/${module.id}`}
            className="card hover:border-gray-600 transition-all duration-200 group flex flex-col">
            {/* Gradient header */}
            <div className={`h-2 rounded-full bg-gradient-to-r ${module.color} mb-4`} />

            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">{module.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors">{module.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{module.subtitle}</p>
              </div>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {module.keyStage.map(ks => (
                <span key={ks} className="badge-blue text-xs">{ks}</span>
              ))}
              <span className={`badge text-xs ${module.difficulty === 'Higher' ? 'badge-red' : 'badge-green'}`}>
                {module.difficulty}
              </span>
            </div>

            {/* Info row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1"><Clock size={11} /> {module.duration}</span>
              <span className="flex items-center gap-1"><Target size={11} /> {module.questions.length} questions</span>
              <span className="flex items-center gap-1"><BookOpen size={11} /> {module.objectives.length} objectives</span>
            </div>

            {/* Curriculum */}
            <p className="text-xs text-gray-500 mb-4 flex-1">{module.curriculum}</p>

            {/* CTA */}
            <div className={`flex items-center justify-between pt-3 border-t border-gray-800`}>
              <span className={`text-xs font-medium ${module.textColor}`}>Open Lesson</span>
              <ChevronRight size={14} className={`${module.textColor} group-hover:translate-x-1 transition-transform`} />
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No lessons match your filters.</p>
        </div>
      )}
    </div>
  )
}
