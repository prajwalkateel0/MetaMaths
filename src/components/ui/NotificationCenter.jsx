import React, { useState, useRef, useEffect } from 'react'
import { Bell, Play, ClipboardList, Trophy, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const typeIcons = {
  session_start: <Play size={14} className="text-green-400" />,
  quiz_assigned: <ClipboardList size={14} className="text-blue-400" />,
  session_ended: <Trophy size={14} className="text-yellow-400" />,
  badge_earned: <span className="text-sm">🏅</span>,
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const qc = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
    placeholderData: [],
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const unread = notifications.filter(n => !n.readAt).length

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="relative text-gray-400 hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-800">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unread > 0 && (
              <button onClick={() => markAllMutation.mutate()} className="text-xs text-blue-400 hover:text-blue-300">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell size={24} className="text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${!n.readAt ? 'bg-blue-500/5' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {typeIcons[n.type] ?? <Bell size={12} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.readAt ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                      {n.payload?.message ?? n.type}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                    {n.payload?.link && (
                      <Link to={n.payload.link} className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
                        onClick={() => { markReadMutation.mutate(n.id); setOpen(false) }}>
                        {n.payload.linkText ?? 'View →'}
                      </Link>
                    )}
                  </div>
                  {!n.readAt && (
                    <button onClick={() => markReadMutation.mutate(n.id)} className="text-gray-600 hover:text-gray-400 p-0.5">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
