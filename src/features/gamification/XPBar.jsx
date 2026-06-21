import React from 'react'
import { Zap } from 'lucide-react'

const LEVELS = [
  { level: 1, name: 'Rookie', min: 0 },
  { level: 2, name: 'Apprentice', min: 50 },
  { level: 3, name: 'Scholar', min: 150 },
  { level: 4, name: 'Expert', min: 350 },
  { level: 5, name: 'Master', min: 700 },
  { level: 6, name: 'Legend', min: 1200 },
]

export function getLevel(xp) {
  let current = LEVELS[0]
  for (const l of LEVELS) { if (xp >= l.min) current = l }
  const nextIdx = LEVELS.indexOf(current) + 1
  const next = LEVELS[nextIdx]
  const progress = next ? ((xp - current.min) / (next.min - current.min)) * 100 : 100
  return { ...current, next, progress: Math.min(progress, 100), xp }
}

export default function XPBar({ xp = 0, compact = false }) {
  const lvl = getLevel(xp)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Zap size={12} className="text-yellow-400" />
          <span className="text-xs font-bold text-yellow-400">Lv.{lvl.level}</span>
        </div>
        <div className="w-20 bg-gray-800 rounded-full h-1.5">
          <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${lvl.progress}%` }} />
        </div>
        <span className="text-xs text-gray-500">{xp} XP</span>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-sm font-bold text-white">Level {lvl.level} — {lvl.name}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{xp} XP total</p>
        </div>
        {lvl.next && <span className="text-xs text-gray-500">{lvl.next.min - xp} XP to Level {lvl.level + 1}</span>}
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3 relative overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-3 rounded-full transition-all duration-700"
          style={{ width: `${lvl.progress}%` }} />
      </div>
    </div>
  )
}
