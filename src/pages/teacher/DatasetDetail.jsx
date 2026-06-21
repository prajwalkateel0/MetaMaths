import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, BarChart3, ClipboardList, ChevronLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

export default function DatasetDetail() {
  const { id } = useParams()
  const { toast } = useUIStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const limit = 50

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => api.get(`/datasets/${id}`).then(r => r.data),
  })

  const { data: rowsData, isLoading: rowsLoading, error: rowsError } = useQuery({
    queryKey: ['dataset-rows', id, page],
    queryFn: () => api.get(`/datasets/${id}/rows?limit=${limit}&offset=${page * limit}`).then(r => r.data),
    retry: 1,
  })

  const refreshMutation = useMutation({
    mutationFn: () => api.post(`/datasets/${id}/refresh`),
    onSuccess: (res) => {
      qc.invalidateQueries(['dataset', id])
      qc.invalidateQueries(['dataset-rows', id])
      toast.success(res.data?.message ?? 'Dataset refreshed!')
    },
    onError: () => toast.error('Refresh failed'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const schema = dataset?.schema ?? []
  const rows = rowsData?.rows ?? []
  const total = rowsData?.total ?? 0
  const rowsMissing = !rowsLoading && !rowsError && total === 0 && (dataset?.rowCount ?? 0) > 0
  const isApiSource = ['api_opendota', 'api_riot', 'api_pandascore'].includes(dataset?.sourceType)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/t/datasets" className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="section-title">{dataset?.title}</h1>
          {dataset?.description && <p className="text-sm text-gray-400 mt-0.5">{dataset.description}</p>}
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="btn-secondary flex items-center gap-2 text-sm">
          {refreshMutation.isPending ? <Spinner size="sm" /> : <RefreshCw size={14} />}
          {isApiSource ? 'Refresh from API' : 'Refresh'}
        </button>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Rows', value: dataset?.rowCount?.toLocaleString() ?? '?' },
          { label: 'Columns', value: schema.length },
          { label: 'Source', value: dataset?.sourceType?.replace('api_', '').replace(/_/g, ' ') ?? '—' },
          { label: 'Last Updated', value: dataset?.refreshedAt ? new Date(dataset.refreshedAt).toLocaleDateString('en-GB') : 'Never' },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="stat-value text-xl">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Schema */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">Column Schema</h2>
        <div className="flex flex-wrap gap-2">
          {schema.map((col) => (
            <div key={col.name} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5">
              <span className={`text-xs font-mono font-bold ${col.type === 'number' ? 'text-blue-400' : col.type === 'date' ? 'text-green-400' : 'text-purple-400'}`}>
                {col.type}
              </span>
              <span className="text-xs text-gray-300">{col.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          <span className="text-blue-400 font-bold">number</span> columns → Y axis &nbsp;·&nbsp;
          <span className="text-purple-400 font-bold">string</span> columns → X axis
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link to={`/t/charts/builder?datasetId=${id}`} className="btn-secondary flex items-center gap-2">
          <BarChart3 size={14} /> Build Chart
        </Link>
        <Link to={`/t/quizzes/builder?datasetId=${id}`} className="btn-secondary flex items-center gap-2">
          <ClipboardList size={14} /> Generate Quiz
        </Link>
      </div>

      {/* Row data missing warning */}
      {rowsMissing && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertCircle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-300">Row data not stored</p>
            <p className="text-xs text-gray-400 mt-0.5">
              The dataset metadata is saved ({dataset?.rowCount} rows expected) but the actual data rows are missing.
              {isApiSource ? ' Click "Refresh from API" to re-fetch and restore the data.' : ' This can happen if the import was interrupted.'}
            </p>
          </div>
          {isApiSource && (
            <button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}
              className="btn-primary text-xs flex-shrink-0 flex items-center gap-1.5">
              {refreshMutation.isPending ? <Spinner size="sm" /> : <RefreshCw size={12} />}
              Fix Now
            </button>
          )}
        </div>
      )}

      {/* API error */}
      {rowsError && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Could not load preview</p>
            <p className="text-xs text-gray-400 mt-0.5">{rowsError?.response?.data?.detail ?? 'An error occurred loading row data. Try refreshing.'}</p>
          </div>
        </div>
      )}

      {/* Data preview table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Data Preview</h2>
          <div className="flex items-center gap-3">
            {total > 0 && <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle size={12} /> {total.toLocaleString()} rows loaded</span>}
            {total === 0 && !rowsLoading && <span className="text-xs text-gray-500">No rows available</span>}
          </div>
        </div>

        {rowsLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <Database size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No data to preview</p>
            {isApiSource && (
              <button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}
                className="btn-primary mt-3 text-sm flex items-center gap-2 mx-auto">
                <RefreshCw size={14} /> Re-fetch from {dataset?.sourceType?.replace('api_', '').replace(/_/g,' ')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800/60 sticky top-0">
                  {schema.map(col => (
                    <th key={col.name} className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-mono ${col.type === 'number' ? 'text-blue-400' : col.type === 'date' ? 'text-green-400' : 'text-purple-400'}`}>
                          {col.type}
                        </span>
                        <span className="text-gray-300">{col.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  // rows from /rows endpoint have { row: {...} } structure
                  const data = row.row ?? row
                  return (
                    <tr key={i} className="border-t border-gray-800/60 hover:bg-gray-800/30">
                      {schema.map(col => (
                        <td key={col.name} className="px-4 py-2.5 text-gray-300 whitespace-nowrap max-w-48 truncate">
                          {data[col.name] !== undefined && data[col.name] !== null
                            ? typeof data[col.name] === 'number'
                              ? Number.isInteger(data[col.name]) ? data[col.name].toLocaleString() : data[col.name].toFixed(2)
                              : String(data[col.name])
                            : <span className="text-gray-700">—</span>}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-gray-900/50">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs disabled:opacity-40">← Previous</button>
            <span className="text-xs text-gray-500">Page {page + 1} of {Math.ceil(total / limit)} · {total.toLocaleString()} rows total</span>
            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
