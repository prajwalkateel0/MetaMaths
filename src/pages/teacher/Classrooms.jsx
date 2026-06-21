import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Copy, QrCode, Trash2, ChevronRight } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'

export default function TeacherClassrooms() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', keyStage: 'KS4', description: '', approvalRequired: false })

  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/classrooms', form),
    onSuccess: () => { qc.invalidateQueries(['classrooms']); setShowCreate(false); toast.success('Classroom created!') },
    onError: () => toast.error('Failed to create classroom'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/classrooms/${id}`),
    onSuccess: () => { qc.invalidateQueries(['classrooms']); toast.success('Classroom deleted') },
  })

  const copyCode = (code) => { navigator.clipboard.writeText(code); toast.success('Join code copied!') }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Classrooms</h1>
          <p className="text-sm text-gray-400 mt-1">{classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Classroom</button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : classrooms.length === 0 ? (
          <EmptyState icon={Users} title="No classrooms yet"
            description="Create a classroom to share quizzes and run live sessions with your students."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">Create classroom</button>} />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {classrooms.map(cls => (
              <div key={cls.id} className="card hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{cls.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{cls.memberCount ?? 0} students · {cls.keyStage}</p>
                  </div>
                  <button onClick={() => setDeleteId(cls.id)} className="text-gray-600 hover:text-red-400 p-1 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                {cls.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{cls.description}</p>}

                {/* Join code */}
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs text-gray-500">Join code:</span>
                  <span className="font-mono font-bold text-primary-400 tracking-widest">{cls.joinCode}</span>
                  <button onClick={() => copyCode(cls.joinCode)} className="ml-auto text-gray-500 hover:text-gray-300">
                    <Copy size={12} />
                  </button>
                </div>

                <Link to={`/t/classrooms/${cls.id}`}
                  className="flex items-center justify-between text-sm text-primary-400 hover:text-primary-300 font-medium">
                  View classroom <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Classroom">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Class Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="e.g. Year 10 Maths - Set 2" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Key Stage</label>
            <select value={form.keyStage} onChange={e => setForm(f => ({ ...f, keyStage: e.target.value }))} className="input">
              {['KS3', 'KS4', 'KS5', 'University'].map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="input resize-none" placeholder="Optional description..." />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="approval" checked={form.approvalRequired}
              onChange={e => setForm(f => ({ ...f, approvalRequired: e.target.checked }))}
              className="w-4 h-4 rounded accent-primary-500" />
            <label htmlFor="approval" className="text-xs text-gray-400">Require approval before students can join</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name}
              className="btn-primary flex-1">
              {createMutation.isPending ? <Spinner size="sm" /> : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete classroom" message="All members and session history will be lost." confirmLabel="Delete" danger />
    </div>
  )
}
