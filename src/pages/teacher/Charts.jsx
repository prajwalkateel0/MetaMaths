import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Plus, Trash2, Share2, Edit, Search } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'

const chartTypeColors = { bar: 'badge-blue', line: 'badge-green', pie: 'badge-purple', scatter: 'badge-yellow', area: 'badge-red', radar: 'badge-gray' }

export default function TeacherCharts() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const { data: charts = [], isLoading } = useQuery({
    queryKey: ['charts'],
    queryFn: () => api.get('/charts').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/charts/${id}`),
    onSuccess: () => { qc.invalidateQueries(['charts']); toast.success('Chart deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const filtered = charts.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Charts</h1>
          <p className="text-sm text-gray-400 mt-1">{charts.length} saved chart{charts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/t/charts/builder" className="btn-primary"><Plus size={16} /> Build Chart</Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search charts..." className="input pl-9" />
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : filtered.length === 0 ? (
          <EmptyState icon={BarChart3} title="No charts yet"
            description="Use the chart builder to create visualisations from your esports datasets."
            action={<Link to="/t/charts/builder" className="btn-primary">Build your first chart</Link>} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((chart) => (
              <div key={chart.id} className="card hover:border-gray-700 transition-colors group">
                {/* Chart preview thumbnail */}
                <div className="w-full h-32 bg-gray-800 rounded-lg mb-3 flex items-center justify-center">
                  <BarChart3 size={32} className="text-gray-600" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{chart.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={chartTypeColors[chart.chartType] ?? 'badge-gray'}>{chart.chartType}</span>
                      <span className="text-xs text-gray-500">{chart.datasetTitle}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t border-gray-800">
                  <Link to={`/t/charts/builder/${chart.id}`} className="btn-ghost p-2 flex-1 justify-center text-xs gap-1">
                    <Edit size={12} /> Edit
                  </Link>
                  <button className="btn-ghost p-2 flex-1 justify-center text-xs gap-1">
                    <Share2 size={12} /> Share
                  </button>
                  <button onClick={() => setDeleteId(chart.id)} className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete chart" message="This chart will be permanently deleted." confirmLabel="Delete" danger />
    </div>
  )
}
