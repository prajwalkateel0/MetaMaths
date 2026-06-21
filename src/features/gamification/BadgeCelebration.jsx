import React, { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

export default function BadgeCelebration({ badge, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!badge) return
    setVisible(true)
    const timer = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300) }, 4000)
    return () => clearTimeout(timer)
  }, [badge])

  if (!badge) return null

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-gray-900 border border-yellow-500/40 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 min-w-72">
        {/* Animated emoji */}
        <div className="text-4xl animate-bounce">{badge.emoji}</div>
        <div>
          <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-0.5">Badge Unlocked!</p>
          <p className="text-lg font-bold text-white">{badge.name}</p>
          <p className="text-sm text-gray-400">{badge.description}</p>
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
          className="ml-auto text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
      </div>
    </div>
  )
}
