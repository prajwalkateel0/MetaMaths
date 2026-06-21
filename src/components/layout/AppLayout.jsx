import React from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useUIStore } from '../../store/uiStore'

export default function AppLayout({ children }) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
