import React, { useState } from 'react'
import { Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

const styleLabels = { formal: 'Formal', conversational: 'Conversational', scenario: 'Scenario-based' }
const styleBadge = { formal: 'badge-blue', conversational: 'badge-green', scenario: 'badge-purple' }

export default function AIEnhancePanel({ question, onSelect, onClose }) {
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState([])
  const [teacherNote, setTeacherNote] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const enhance = async () => {
    setLoading(true)
    setError('')
    setVersions([])
    try {
      const { data } = await api.post('/quizzes/llm/enhance', {
        prompt: question.prompt,
        topic: question.generatorMeta?.topic,
        difficulty: question.difficulty,
        questionType: question.questionType,
        correctAnswer: question.correctAnswer,
      })
      setVersions(data.versions ?? [])
      setTeacherNote(data.teacherNote ?? '')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'AI enhancement failed. Check your GEMINI_API_KEY in server/.env')
    } finally {
      setLoading(false)
    }
  }

  const pick = (v) => {
    setSelected(v.style)
    onSelect(v.prompt)
  }

  return (
    <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-purple-300">AI Question Enhancement</span>
          <span className="badge-green text-xs">Gemini</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">✕ Close</button>
      </div>

      {/* Original prompt */}
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Original question:</p>
        <p className="text-sm text-gray-200">{question.prompt || '(no prompt yet — write one first)'}</p>
      </div>

      {/* Generate button */}
      <button onClick={enhance} disabled={loading || !question.prompt}
        className="btn-primary w-full bg-purple-600 hover:bg-purple-500">
        {loading ? <><Spinner size="sm" /> Generating 3 versions...</> : <><Sparkles size={14} /> Generate Alternatives</>}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Versions */}
      {versions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Click a version to use it. The answer stays unchanged.</p>
          {versions.map((v) => (
            <button key={v.style} onClick={() => pick(v)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selected === v.style ? 'border-green-500 bg-green-500/10' : 'border-gray-700 hover:border-purple-500/50 hover:bg-gray-800'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={styleBadge[v.style] ?? 'badge-gray'}>{styleLabels[v.style] ?? v.style}</span>
                {selected === v.style && <Check size={12} className="text-green-400 ml-auto" />}
              </div>
              <p className="text-sm text-gray-200">{v.prompt}</p>
            </button>
          ))}
        </div>
      )}

      {/* Teacher note */}
      {teacherNote && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Pedagogical note:</p>
          <p className="text-xs text-blue-300">{teacherNote}</p>
        </div>
      )}

      {/* Dissertation note */}
      <p className="text-xs text-gray-600 italic">
        Hybrid approach: rule engine computes the correct answer; Gemini 2.5 Flash only rephrases the wording.
        This prevents hallucinated answers (Kurdi et al., 2020).
      </p>
    </div>
  )
}
