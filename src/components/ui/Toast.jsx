import React from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

const icons = {
  success: <CheckCircle size={18} className="text-green-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  info: <Info size={18} className="text-blue-400" />,
  warning: <AlertTriangle size={18} className="text-yellow-400" />,
}

const colors = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
}

export default function Toast() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border ${colors[t.type]} backdrop-blur-sm animate-slide-up`}
        >
          <span className="mt-0.5">{icons[t.type]}</span>
          <span className="flex-1 text-sm text-gray-200">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
