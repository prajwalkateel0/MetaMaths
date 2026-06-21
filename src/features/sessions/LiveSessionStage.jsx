import React, { useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

const optionColors = ['bg-blue-600 hover:bg-blue-500', 'bg-purple-600 hover:bg-purple-500', 'bg-orange-600 hover:bg-orange-500', 'bg-green-600 hover:bg-green-500']
const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F']

export default function LiveSessionStage({ question, answered, lastResult, onSubmit, timeLeft, practiceMode = false }) {
  const [numericInput, setNumericInput] = useState('')
  const [shortInput, setShortInput] = useState('')
  const [selected, setSelected] = useState(null)

  const handleMCQ = (idx) => {
    if (answered) return
    setSelected(idx)
    onSubmit(idx)
  }

  const handleTrueFalse = (val) => {
    if (answered) return
    onSubmit(val)
  }

  const handleNumeric = () => {
    if (answered) return
    onSubmit(parseFloat(numericInput))
  }

  const handleShort = () => {
    if (answered) return
    onSubmit(shortInput.trim())
  }

  const isCorrect = lastResult?.pointsAwarded > 0

  return (
    <div className="card space-y-6">
      {/* Question prompt */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-purple text-xs">{question.questionType?.replace('_', ' ')}</span>
          <span className="text-xs text-gray-500">{question.points} pt{question.points !== 1 ? 's' : ''}</span>
          {timeLeft > 0 && (
            <span className={`ml-auto flex items-center gap-1 text-sm font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-gray-300'}`}>
              <Clock size={14} /> {timeLeft}s
            </span>
          )}
        </div>
        <p className="text-lg font-medium text-white leading-relaxed">{question.prompt}</p>
      </div>

      {/* Time progress bar */}
      {timeLeft > 0 && !practiceMode && (
        <div className="w-full bg-gray-800 rounded-full h-1">
          <div className="bg-primary-500 h-1 rounded-full transition-all duration-1000"
            style={{ width: `${(timeLeft / (question.timeLimitSec ?? 30)) * 100}%` }} />
        </div>
      )}

      {/* Answer input by type */}
      {question.questionType === 'mcq' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(question.options ?? []).map((opt, i) => {
            const isSelected = selected === i
            const showCorrect = answered && (practiceMode || question.revealed)
            const isCorrectAnswer = showCorrect && i === question.correctAnswer

            return (
              <button key={i} onClick={() => handleMCQ(i)} disabled={answered}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                  ${!answered ? optionColors[i % optionColors.length] + ' border-transparent text-white cursor-pointer'
                    : isCorrectAnswer ? 'border-green-500 bg-green-500/20 text-green-300 cursor-default'
                    : isSelected && !isCorrectAnswer ? 'border-red-500 bg-red-500/20 text-red-300 cursor-default'
                    : 'border-gray-700 bg-gray-800 text-gray-500 cursor-default'}`}>
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {optionLabels[i]}
                </span>
                <span className="text-sm font-medium">{opt}</span>
                {answered && isCorrectAnswer && <CheckCircle size={16} className="ml-auto text-green-400" />}
                {answered && isSelected && !isCorrectAnswer && <XCircle size={16} className="ml-auto text-red-400" />}
              </button>
            )
          })}
        </div>
      )}

      {question.questionType === 'true_false' && (
        <div className="grid grid-cols-2 gap-4">
          {['true', 'false'].map((val) => {
            const showCorrect = answered && (practiceMode || question.revealed)
            const isCorrectAnswer = showCorrect && val === question.correctAnswer
            return (
              <button key={val} onClick={() => handleTrueFalse(val)} disabled={answered}
                className={`py-6 rounded-xl text-xl font-bold capitalize border-2 transition-all
                  ${!answered ? (val === 'true' ? 'bg-green-600 border-transparent text-white' : 'bg-red-600 border-transparent text-white')
                    : isCorrectAnswer ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-gray-700 bg-gray-800 text-gray-500'}`}>
                {val}
              </button>
            )
          })}
        </div>
      )}

      {question.questionType === 'numeric' && (
        <div className="flex gap-3">
          <input type="number" value={numericInput} onChange={e => setNumericInput(e.target.value)}
            disabled={answered} className="input flex-1 text-lg text-center font-mono" placeholder="Enter your answer..." />
          <button onClick={handleNumeric} disabled={answered || !numericInput} className="btn-primary px-8">Submit</button>
        </div>
      )}

      {['short_answer', 'fill_blank'].includes(question.questionType) && (
        <div className="flex gap-3">
          <input type="text" value={shortInput} onChange={e => setShortInput(e.target.value)}
            disabled={answered} onKeyDown={e => e.key === 'Enter' && handleShort()}
            className="input flex-1" placeholder="Type your answer..." />
          <button onClick={handleShort} disabled={answered || !shortInput.trim()} className="btn-primary px-8">Submit</button>
        </div>
      )}

      {/* Result feedback */}
      {answered && lastResult && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isCorrect ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          {isCorrect
            ? <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
            : <XCircle size={20} className="text-red-400 flex-shrink-0" />}
          <div>
            <p className={`font-semibold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
              {isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
            </p>
            <p className="text-xs text-gray-400">
              {isCorrect ? `+${lastResult.pointsAwarded} points` : 'No points awarded'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
