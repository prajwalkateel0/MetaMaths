import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

const TYPES = ['mcq', 'true_false', 'numeric', 'short_answer', 'fill_blank']

export default function QuestionEditor({ question, onChange }) {
  const set = (key) => (e) => onChange({ [key]: e.target ? e.target.value : e })

  const setOption = (idx, value) => {
    const options = [...(question.options ?? [])]
    options[idx] = value
    onChange({ options })
  }

  const addOption = () => onChange({ options: [...(question.options ?? []), ''] })
  const removeOption = (idx) => onChange({ options: question.options.filter((_, i) => i !== idx) })

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Question Type</label>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <button key={t} type="button" onClick={() => onChange({ questionType: t })}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all
                ${question.questionType === t ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Question Prompt *</label>
        <textarea value={question.prompt ?? ''} onChange={set('prompt')} rows={3}
          className="input resize-none text-sm" placeholder="e.g. What is the mean KDA of player X over the last 10 matches?" />
      </div>

      {/* MCQ options */}
      {question.questionType === 'mcq' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Answer Options</label>
          <div className="space-y-2">
            {(question.options ?? ['', '', '', '']).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button type="button" onClick={() => onChange({ correctAnswer: i })}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors
                    ${question.correctAnswer === i ? 'border-green-500 bg-green-500' : 'border-gray-600 hover:border-gray-400'}`} />
                <span className="text-xs text-gray-500 font-mono w-4">{String.fromCharCode(65 + i)}.</span>
                <input value={opt} onChange={e => setOption(i, e.target.value)}
                  className="input flex-1 text-sm py-1.5"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                {(question.options ?? []).length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-gray-600 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {(question.options ?? []).length < 6 && (
            <button type="button" onClick={addOption} className="btn-ghost text-xs mt-2 flex items-center gap-1">
              <Plus size={12} /> Add option
            </button>
          )}
          <p className="text-xs text-gray-500 mt-1">Click the circle to mark the correct answer</p>
        </div>
      )}

      {/* True/False */}
      {question.questionType === 'true_false' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Correct Answer</label>
          <div className="flex gap-2">
            {['true', 'false'].map(v => (
              <button key={v} type="button" onClick={() => onChange({ correctAnswer: v })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${question.correctAnswer === v ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Numeric */}
      {question.questionType === 'numeric' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Correct Answer</label>
            <input type="number" value={question.correctAnswer ?? ''} onChange={e => onChange({ correctAnswer: +e.target.value })} className="input text-sm" placeholder="e.g. 3.14" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Tolerance (±)</label>
            <input type="number" value={question.tolerance ?? 0} onChange={e => onChange({ tolerance: +e.target.value })} className="input text-sm" placeholder="0.01" />
          </div>
        </div>
      )}

      {/* Short answer / fill blank */}
      {['short_answer', 'fill_blank'].includes(question.questionType) && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Expected Answer(s)</label>
          <input value={question.correctAnswer ?? ''} onChange={set('correctAnswer')} className="input text-sm" placeholder="Accepted answer (comma-separate alternatives)" />
        </div>
      )}

      {/* Points & time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Points</label>
          <input type="number" min={1} max={10} value={question.points ?? 1} onChange={e => onChange({ points: +e.target.value })} className="input text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Time Limit (seconds)</label>
          <input type="number" min={10} max={300} value={question.timeLimitSec ?? 30} onChange={e => onChange({ timeLimitSec: +e.target.value })} className="input text-sm" />
        </div>
      </div>
    </div>
  )
}
