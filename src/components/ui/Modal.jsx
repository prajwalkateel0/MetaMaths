import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
