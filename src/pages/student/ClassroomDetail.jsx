import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Play, BarChart3, Clock, Megaphone, BookOpen, ExternalLink } from 'lucide-react'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'
import { LESSON_MODULES } from '../../data/lessonModules'

export default function StudentClassroomDetail() {
  const { id } = useParams()

  const { data: classroom, isLoading } = useQuery({
    queryKey: ['classroom', id],
    queryFn: () => api.get(`/classrooms/${id}`).then(r => r.data),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['classroom-dashboard', id],
    queryFn: () => api.get(`/classrooms/${id}/dashboard`).then(r => r.data),
    placeholderData: { config: {}, charts: [] },
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const cfg = dashboard?.config ?? {}
  const pinnedCharts = dashboard?.charts ?? []
  const announcements = cfg.announcements ?? []
  const pinnedLessons = (cfg.pinnedLessons ?? []).map(lid => LESSON_MODULES.find(m => m.id === lid)).filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/s/classrooms" className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="section-title">{classroom?.name}</h1>
          <p className="text-sm text-gray-400">{classroom?.teacherName} · {classroom?.keyStage}</p>
        </div>
      </div>

      {/* Active session banner */}
      {classroom?.activeSession && (
        <div className="card border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div className="flex-1">
              <p className="text-white font-medium">Live session in progress!</p>
              <p className="text-xs text-gray-400">{classroom.activeSession.quizTitle}</p>
            </div>
            <Link to={`/s/sessions/${classroom.activeSession.id}`} className="btn-primary text-sm">
              <Play size={14} /> Join Now
            </Link>
          </div>
        </div>
      )}

      {/* Welcome message */}
      {cfg.welcomeMessage && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-200">👋 {cfg.welcomeMessage}</p>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Megaphone size={14} className="text-yellow-400" /> Announcements
          </h2>
          {announcements.map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <Megaphone size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-200">{a.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pinned lessons */}
      {pinnedLessons.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen size={14} className="text-green-400" /> Lessons from your teacher
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinnedLessons.map(m => (
              <Link key={m.id} to={`/s/lessons/${m.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all group">
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 group-hover:text-white">{m.title}</p>
                  <p className="text-xs text-gray-500">{m.duration} · {m.difficulty}</p>
                </div>
                <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Shared charts */}
      {pinnedCharts.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" /> Charts shared by teacher
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {pinnedCharts.map(chart => (
              <div key={chart.id} className="bg-gray-800 rounded-xl p-3">
                <div className="h-20 bg-gray-700/50 rounded-lg flex items-center justify-center mb-2">
                  <BarChart3 size={22} className="text-gray-600" />
                </div>
                <p className="text-xs font-medium text-gray-200 truncate">{chart.title || 'Chart'}</p>
                <p className="text-xs text-gray-500 capitalize">{chart.chartType}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">My Sessions</h2>
        {(classroom?.mySessions ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No sessions attended yet</p>
        ) : (
          <div className="space-y-2">
            {(classroom?.mySessions ?? []).map(s => (
              <Link key={s.id} to={`/s/sessions/${s.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                <Clock size={14} className="text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{s.quizTitle}</p>
                  <p className="text-xs text-gray-500">{new Date(s.startedAt).toLocaleDateString()}</p>
                </div>
                {s.myScore !== undefined && (
                  <span className={`text-sm font-bold ${s.myScore >= 70 ? 'text-green-400' : s.myScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {s.myScore}%
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
