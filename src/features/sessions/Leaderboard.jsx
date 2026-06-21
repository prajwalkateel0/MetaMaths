import React from 'react'
import { Trophy, Medal } from 'lucide-react'

const rankColors = ['text-yellow-400', 'text-gray-400', 'text-orange-600']
const rankBg = ['bg-yellow-500/10', 'bg-gray-500/10', 'bg-orange-600/10']
const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard({ entries = [], highlightId, compact = false }) {
  if (entries.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-yellow-400" />
        <h3 className="text-sm font-semibold text-white">Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {entries.slice(0, compact ? 5 : 10).map((entry, i) => {
          const isMe = entry.studentId === highlightId
          return (
            <div key={entry.studentId ?? i}
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all animate-rank-change
                ${isMe ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-gray-800/50'}
                ${i < 3 ? rankBg[i] : ''}`}>
              <span className={`text-sm font-bold w-6 text-center ${i < 3 ? rankColors[i] : 'text-gray-500'}`}>
                {i < 3 ? medals[i] : `#${i + 1}`}
              </span>
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-300 font-bold">{entry.displayName?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isMe ? 'text-primary-300' : 'text-gray-200'}`}>
                  {entry.displayName ?? 'Player'}{isMe ? ' (You)' : ''}
                </p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${i === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                {entry.totalPoints ?? 0} pts
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
