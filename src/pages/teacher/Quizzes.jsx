import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, Trash2, Play, Edit, Search, Eye } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'

const statusColors = { draft: 'badge-yellow', published: 'badge-green', archived: 'badge-gray' }

export default function TeacherQuizzes() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/quizzes/${id}`),
    onSuccess: () => { qc.invalidateQueries(['quizzes']); toast.success('Quiz deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const filtered = quizzes.filter(q => q.title?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Quizzes</h1>
          <p className="text-sm text-gray-400 mt-1">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
        </div>
        <Link to="/t/quizzes/builder" className="btn-primary"><Plus size={16} /> New Quiz</Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="input pl-9" />
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No quizzes yet"
            description="Create a quiz manually or auto-generate questions from your esports datasets."
            action={<Link to="/t/quizzes/builder" className="btn-primary">Create first quiz</Link>} />
        ) : (
          <div className="space-y-3">
            {filtered.map(quiz => (
              <div key={quiz.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={18} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{quiz.title}</span>
                    <span className={statusColors[quiz.status] ?? 'badge-gray'}>{quiz.status}</span>
                    {quiz.difficulty && <span className="badge-gray">{quiz.difficulty}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {quiz.questionCount ?? 0} questions
                    {quiz.topic && ` · ${quiz.topic}`}
                    {quiz.classroomName && ` · ${quiz.classroomName}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/t/quizzes/builder/${quiz.id}`} className="btn-ghost p-2" title="Edit"><Edit size={14} /></Link>
                  <button className="btn-ghost p-2" title="Preview"><Eye size={14} /></button>
                  {quiz.status === 'published' && (
                    <button className="btn-ghost p-2 text-green-400 hover:text-green-300" title="Run session"><Play size={14} /></button>
                  )}
                  <button onClick={() => setDeleteId(quiz.id)} className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete quiz" message="All questions and session history for this quiz will be deleted." confirmLabel="Delete" danger />
    </div>
  )
}
