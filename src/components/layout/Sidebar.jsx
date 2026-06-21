import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Database, BarChart3, ClipboardList, Users,
  BookOpen, Activity, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Gamepad2, Star, Trophy, GraduationCap, LayoutTemplate
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

const teacherLinks = [
  { to: '/t/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/t/lessons', label: 'Lessons', icon: GraduationCap },
  { to: '/t/datasets', label: 'Datasets', icon: Database },
  { to: '/t/charts', label: 'Charts', icon: BarChart3 },
  { to: '/t/chart-templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/t/quizzes', label: 'Quizzes', icon: ClipboardList },
  { to: '/t/classrooms', label: 'Classrooms', icon: Users },
  { to: '/t/analytics', label: 'Analytics', icon: Activity },
]

const studentLinks = [
  { to: '/s/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/s/classrooms', label: 'My Classes', icon: BookOpen },
  { to: '/s/results', label: 'My Results', icon: Trophy },
  { to: '/s/practice', label: 'Practice', icon: Star },
]

const adminLinks = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/data-sources', label: 'Data Sources', icon: Database },
  { to: '/admin/audit', label: 'Audit Log', icon: Shield },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const navigate = useNavigate()

  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'teacher' ? teacherLinks
    : studentLinks

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 z-40
      transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64' : 'w-16'}`}>

      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 h-16">
        <div className="w-8 h-8 rounded-lg esport-gradient flex items-center justify-center flex-shrink-0">
          <Gamepad2 size={16} className="text-white" />
        </div>
        {sidebarOpen && <span className="font-bold text-white text-lg">MetaMaths</span>}
      </div>

      {/* Role badge */}
      {sidebarOpen && user && (
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center">
              <span className="text-primary-400 text-xs font-bold">{user.displayName?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        <div className={`space-y-1 ${sidebarOpen ? 'px-3' : 'px-2'}`}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className={`border-t border-gray-800 py-3 ${sidebarOpen ? 'px-3' : 'px-2'} space-y-1`}>
        <NavLink to="/profile" className={`sidebar-link ${!sidebarOpen ? 'justify-center' : ''}`}>
          <Settings size={18} className="flex-shrink-0" />
          {sidebarOpen && <span>Profile</span>}
        </NavLink>
        <button onClick={handleLogout} className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${!sidebarOpen ? 'justify-center' : ''}`}>
          <LogOut size={18} className="flex-shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  )
}
