import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Hash } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

export default function StudentClassrooms() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [showJoin, setShowJoin] = useState(false)
  const [code, setCode] = useState('')

  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['my-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  })

  const joinMutation = useMutation({
    mutationFn: () => api.post('/classrooms/join', { code: code.toUpperCase() }),
    onSuccess: () => { qc.invalidateQueries(['my-classrooms']); setShowJoin(false); setCode(''); toast.success('Joined classroom!') },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Invalid join code'),
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title">My Classes</h1>
        <button onClick={() => setShowJoin(true)} className="btn-primary"><Plus size={16} /> Join Class</button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : classrooms.length === 0 ? (
          <EmptyState icon={BookOpen} title="No classes yet"
            description="Ask your teacher for a join code to enrol in a class."
            action={<button onClick={() => setShowJoin(true)} className="btn-primary">Join a class</button>} />
        ) : (
          <div className="space-y-3">
            {classrooms.map(cls => (
              <Link key={cls.id} to={`/s/classrooms/${cls.id}`} className="card-hover flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl esport-gradient flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{cls.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{cls.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cls.keyStage} · {cls.memberCount ?? 0} students
                    {cls.teacherName && ` · ${cls.teacherName}`}
                  </p>
                </div>
                {cls.pendingQuizzes > 0 && (
                  <span className="badge-yellow">{cls.pendingQuizzes} pending</span>
                )}
              </Link>
            ))}
          </div>
        )}

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join a Classroom" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Enter Join Code</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123" maxLength={8}
              className="input text-center text-2xl tracking-widest font-mono uppercase" />
            <p className="text-xs text-gray-500 mt-1 text-center">Get the 6-character code from your teacher</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowJoin(false)} className="btn-outline flex-1">Cancel</button>
            <button onClick={() => joinMutation.mutate()} disabled={code.length < 4 || joinMutation.isPending} className="btn-primary flex-1">
              {joinMutation.isPending ? <Spinner size="sm" /> : 'Join'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
