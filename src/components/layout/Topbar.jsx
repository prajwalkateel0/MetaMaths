import React, { useState } from 'react'
import { Search, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import NotificationCenter from '../ui/NotificationCenter'

export default function Topbar() {
  const { user } = useAuthStore()
  const { toggleSidebar } = useUIStore()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="h-16 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center gap-4 px-6 sticky top-0 z-30">
      <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-200 transition-colors lg:hidden">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search datasets, quizzes, charts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationCenter />
        <Link to="/profile" className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-600/30 hover:bg-blue-600/30 transition-colors">
          <span className="text-blue-400 text-sm font-bold">{user?.displayName?.[0]?.toUpperCase()}</span>
        </Link>
      </div>
    </header>
  )
}
