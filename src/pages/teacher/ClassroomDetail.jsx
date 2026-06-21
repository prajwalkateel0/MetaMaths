import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Play, ChevronLeft, Copy, UserX, BarChart3, Plus, Trash2,
  Megaphone, BookOpen, LayoutDashboard, Save, X, GraduationCap
} from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { LESSON_MODULES } from '../../data/lessonModules'

export default function ClassroomDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [showStartSession, setShowStartSession] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState('')
  const [mode, setMode] = useState('live')

  // Dashboard builder state
  const [welcomeMsg, setWelcomeMsg] = useState('')
  const [announcements, setAnnouncements] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [pinnedLessons, setPinnedLessons] = useState([])
  const [dashboardSaving, setDashboardSaving] = useState(false)

  const { data: classroom, isLoading } = useQuery({
    queryKey: ['classroom', id],
    queryFn: () => api.get(`/classrooms/${id}`).then(r => r.data),
  })
  const { data: members = [] } = useQuery({
    queryKey: ['classroom-members', id],
    queryFn: () => api.get(`/classrooms/${id}/members`).then(r => r.data),
  })
  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then(r => r.data),
  })
  const { data: dashboard } = useQuery({
    queryKey: ['classroom-dashboard', id],
    queryFn: () => api.get(`/classrooms/${id}/dashboard`).then(r => r.data),
  })
  const { data: allCharts = [] } = useQuery({
    queryKey: ['charts'],
    queryFn: () => api.get('/charts').then(r => r.data),
  })

  useEffect(() => {
    if (dashboard?.config) {
      setWelcomeMsg(dashboard.config.welcomeMessage ?? '')
      setAnnouncements(dashboard.config.announcements ?? [])
      setPinnedLessons(dashboard.config.pinnedLessons ?? [])
    }
  }, [dashboard])

  const startSessionMutation = useMutation({
    mutationFn: () => api.post(`/classrooms/${id}/sessions`, { quizId: selectedQuiz, mode }),
    onSuccess: (res) => {
      toast.success('Session started!')
      window.location.href = `/t/sessions/${res.data.id}`
    },
    onError: () => toast.error('Failed to start session'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => api.delete(`/classrooms/${id}/members/${userId}`),
    onSuccess: () => { qc.invalidateQueries(['classroom-members', id]); toast.success('Student removed') },
  })

  const shareChartMutation = useMutation({
    mutationFn: (chartId) => api.post(`/classrooms/${id}/charts`, { chartId }),
    onSuccess: () => { qc.invalidateQueries(['classroom-dashboard', id]); toast.success('Chart added to dashboard') },
  })

  const unshareChartMutation = useMutation({
    mutationFn: (chartId) => api.delete(`/classrooms/${id}/charts/${chartId}`),
    onSuccess: () => { qc.invalidateQueries(['classroom-dashboard', id]); toast.success('Chart removed') },
  })

  const saveDashboard = async () => {
    setDashboardSaving(true)
    try {
      await api.patch(`/classrooms/${id}/dashboard`, {
        welcomeMessage: welcomeMsg,
        announcements,
        pinnedLessons,
      })
      qc.invalidateQueries(['classroom-dashboard', id])
      toast.success('Dashboard saved!')
    } catch { toast.error('Save failed') }
    finally { setDashboardSaving(false) }
  }

  const addAnnouncement = () => {
    if (!newAnnouncement.trim()) return
    setAnnouncements(prev => [...prev, { id: Date.now().toString(), text: newAnnouncement.trim(), createdAt: new Date().toISOString() }])
    setNewAnnouncement('')
  }

  const removeAnnouncement = (announcementId) => setAnnouncements(prev => prev.filter(a => a.id !== announcementId))

  const toggleLesson = (lessonId) => setPinnedLessons(prev => prev.includes(lessonId) ? prev.filter(l => l !== lessonId) : [...prev, lessonId])

  const copyCode = () => { navigator.clipboard.writeText(classroom?.joinCode); toast.success('Code copied!') }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const publishedQuizzes = quizzes.filter(q => q.status === 'published')
  const pinnedCharts = dashboard?.charts ?? []
  const unsharedCharts = allCharts.filter(c => !pinnedCharts.find(p => p.id === c.id))

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'dashboard', label: 'Student Dashboard', icon: LayoutDashboard },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/t/classrooms" className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="section-title">{classroom?.name}</h1>
          <p className="text-sm text-gray-400">{classroom?.keyStage} · {members.length} students</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowStartSession(true)} className="btn-primary">
            <Play size={14} /> Start Session
          </button>
        </div>
      </div>

      {/* Join code */}
      <div className="card flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Join Code</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-primary-400">{classroom?.joinCode}</p>
        </div>
        <button onClick={copyCode} className="btn-ghost ml-auto flex items-center gap-1.5 text-sm">
          <Copy size={14} /> Copy
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
        {tabs.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setActiveTab(tid)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tid ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Students ({members.length})</h2>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No students yet. Share the join code!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map(m => (
                  <div key={m.studentId} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center">
                      <span className="text-xs text-primary-400 font-bold">{m.displayName?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{m.displayName}</p>
                      <p className="text-xs text-gray-500">{m.status}</p>
                    </div>
                    <button onClick={() => removeMemberMutation.mutate(m.studentId)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1">
                      <UserX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Recent Sessions</h2>
            {(classroom?.sessions ?? []).length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">No sessions yet</p>
                <button onClick={() => setShowStartSession(true)} className="btn-primary text-xs">
                  <Play size={12} /> Start first session
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {(classroom?.sessions ?? []).slice(0, 5).map(s => (
                  <Link key={s.id} to={`/t/sessions/${s.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${s.status === 'ended' ? 'bg-gray-600' : 'bg-green-400 animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{s.quizTitle}</p>
                      <p className="text-xs text-gray-500">{new Date(s.startedAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`badge ${s.status === 'ended' ? 'badge-gray' : 'badge-green'}`}>{s.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dashboard Builder tab ─────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Build what students see when they open this classroom.</p>
            <button onClick={saveDashboard} disabled={dashboardSaving} className="btn-primary flex items-center gap-2">
              {dashboardSaving ? <Spinner size="sm" /> : <Save size={14} />} Save Dashboard
            </button>
          </div>

          {/* Welcome message */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <GraduationCap size={16} className="text-blue-400" /> Welcome Message
            </h3>
            <input
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              className="input text-sm"
              placeholder="e.g. Welcome to Year 9 Maths! This week we're studying averages using esports data."
            />
            <p className="text-xs text-gray-500">Shown as a banner at the top of the student dashboard.</p>
          </div>

          {/* Announcements */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone size={16} className="text-yellow-400" /> Announcements
            </h3>
            <div className="flex gap-2">
              <input
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAnnouncement()}
                className="input text-sm flex-1"
                placeholder="Type an announcement and press Enter..."
              />
              <button onClick={addAnnouncement} className="btn-secondary"><Plus size={14} /></button>
            </div>
            {announcements.length === 0 ? (
              <p className="text-xs text-gray-500">No announcements yet.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <Megaphone size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-200 flex-1">{a.text}</p>
                    <button onClick={() => removeAnnouncement(a.id)} className="text-gray-600 hover:text-red-400"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pin lessons */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-green-400" /> Pinned Lessons
            </h3>
            <p className="text-xs text-gray-500">Select lessons to appear on the student dashboard.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {LESSON_MODULES.map(m => {
                const selected = pinnedLessons.includes(m.id)
                return (
                  <button key={m.id} onClick={() => toggleLesson(m.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${selected ? 'border-green-500/50 bg-green-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}>
                    <span className="text-lg">{m.icon}</span>
                    <p className="text-xs font-medium text-gray-200 mt-1">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.duration}</p>
                    {selected && <span className="text-xs text-green-400 font-medium">✓ Pinned</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Charts */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-400" /> Shared Charts
            </h3>
            {pinnedCharts.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {pinnedCharts.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate">{c.title || c.chartType}</p>
                      <p className="text-xs text-gray-500">{c.chartType}</p>
                    </div>
                    <button onClick={() => unshareChartMutation.mutate(c.id)} className="text-gray-600 hover:text-red-400 ml-2"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            {unsharedCharts.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Add a chart from your library:</p>
                <div className="flex flex-wrap gap-2">
                  {unsharedCharts.map(c => (
                    <button key={c.id} onClick={() => shareChartMutation.mutate(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700">
                      <Plus size={10} /> {c.title || c.chartType}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allCharts.length === 0 && <p className="text-xs text-gray-500">No charts yet — build one in the Charts section.</p>}
          </div>
        </div>
      )}

      {/* Start Session Modal */}
      <Modal open={showStartSession} onClose={() => setShowStartSession(false)} title="Start Session">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Quiz</label>
            <select value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)} className="input">
              <option value="">Select a published quiz...</option>
              {publishedQuizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
            {publishedQuizzes.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                No published quizzes. <Link to="/t/quizzes/builder" className="underline">Create one first.</Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'live', label: 'Live Session', desc: 'Real-time with leaderboard' }, { id: 'async', label: 'Homework', desc: 'Students complete in own time' }].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${mode === m.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                  <p className="text-sm font-medium text-white">{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowStartSession(false)} className="btn-outline flex-1">Cancel</button>
            <button onClick={() => startSessionMutation.mutate()} disabled={!selectedQuiz || startSessionMutation.isPending} className="btn-primary flex-1">
              {startSessionMutation.isPending ? <Spinner size="sm" /> : <><Play size={14} /> Start</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
