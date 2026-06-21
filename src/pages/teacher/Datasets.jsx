import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Plus, Upload, Download, Trash2, RefreshCw, Search, ExternalLink } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'

const sourceLabels = {
  csv_upload: { label: 'CSV', color: 'badge-blue' },
  api_opendota: { label: 'OpenDota', color: 'badge-purple' },
  api_riot: { label: 'Riot', color: 'badge-red' },
  api_pandascore: { label: 'PandaScore', color: 'badge-yellow' },
  google_drive: { label: 'Google Drive', color: 'badge-green' },
}

export default function TeacherDatasets() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/datasets/${id}`),
    onSuccess: () => { qc.invalidateQueries(['datasets']); toast.success('Dataset deleted') },
    onError: () => toast.error('Failed to delete dataset'),
  })

  const refreshMutation = useMutation({
    mutationFn: (id) => api.post(`/datasets/${id}/refresh`),
    onSuccess: () => { qc.invalidateQueries(['datasets']); toast.success('Dataset refreshed') },
  })

  const filtered = datasets.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Datasets</h1>
          <p className="text-sm text-gray-400 mt-1">{datasets.length} dataset{datasets.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/t/datasets/new" className="btn-primary">
          <Plus size={16} /> Import Dataset
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search datasets..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search ? 'No datasets match your search' : 'No datasets yet'}
          description={search ? 'Try a different search term.' : 'Import a CSV or connect to an esports API to get started.'}
          action={!search && <Link to="/t/datasets/new" className="btn-primary">Import your first dataset</Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((ds) => {
            const src = sourceLabels[ds.sourceType] ?? { label: ds.sourceType, color: 'badge-gray' }
            return (
              <div key={ds.id} className="card-hover flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Database size={18} className="text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/t/datasets/${ds.id}`} className="text-sm font-medium text-white hover:text-primary-400 transition-colors truncate">
                      {ds.title}
                    </Link>
                    <span className={src.color}>{src.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ds.rowCount?.toLocaleString() ?? '?'} rows · {ds.schema?.length ?? 0} columns
                    {ds.refreshedAt && ` · Updated ${new Date(ds.refreshedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {['api_opendota', 'api_riot', 'api_pandascore', 'google_drive'].includes(ds.sourceType) && (
                    <button onClick={() => refreshMutation.mutate(ds.id)}
                      disabled={refreshMutation.isPending}
                      className="btn-ghost p-2" title="Refresh data">
                      <RefreshCw size={14} className={refreshMutation.isPending ? 'animate-spin' : ''} />
                    </button>
                  )}
                  <Link to={`/t/datasets/${ds.id}`} className="btn-ghost p-2" title="View dataset">
                    <ExternalLink size={14} />
                  </Link>
                  <button onClick={() => setDeleteId(ds.id)} className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete dataset"
        message="This will permanently delete the dataset and all associated charts may break. Are you sure?"
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
