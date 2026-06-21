import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Globe, Key, CheckCircle, XCircle, Save } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

const SOURCES = [
  { id: 'opendota', name: 'OpenDota', game: 'Dota 2', free: true, fields: [{ key: 'apiKey', label: 'API Key (optional — higher rate limits)', placeholder: 'Leave blank for free tier' }] },
  { id: 'riot', name: 'Riot Games', game: 'LoL / Valorant / TFT', free: false, fields: [{ key: 'apiKey', label: 'Riot API Key *', placeholder: 'RGAPI-...' }, { key: 'region', label: 'Default Region', placeholder: 'euw1' }] },
  { id: 'pandascore', name: 'PandaScore', game: 'LoL, CS2, Valorant, Dota, RL', free: false, fields: [{ key: 'apiKey', label: 'PandaScore API Key *', placeholder: 'Your API key' }] },
]

export default function AdminDataSources() {
  const { toast } = useUIStore()
  const [configs, setConfigs] = useState({})
  const [testResults, setTestResults] = useState({})

  const saveMutation = useMutation({
    mutationFn: ({ sourceId, config }) => api.post('/admin/data-sources', { sourceId, ...config }),
    onSuccess: (_, vars) => toast.success(`${vars.sourceId} configured!`),
    onError: () => toast.error('Save failed'),
  })

  const testMutation = useMutation({
    mutationFn: (sourceId) => api.post(`/admin/data-sources/${sourceId}/test`),
    onSuccess: (res, sourceId) => setTestResults(r => ({ ...r, [sourceId]: { ok: true, msg: res.data.message } })),
    onError: (err, sourceId) => setTestResults(r => ({ ...r, [sourceId]: { ok: false, msg: err.response?.data?.detail ?? 'Test failed' } })),
  })

  const setField = (sourceId, key, value) => setConfigs(c => ({ ...c, [sourceId]: { ...(c[sourceId] ?? {}), [key]: value } }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">Data Source Configuration</h1>
        <p className="text-sm text-gray-400 mt-1">Configure API credentials for esports data sources</p>
      </div>

      <div className="space-y-4">
        {SOURCES.map(src => {
          const result = testResults[src.id]
          return (
            <div key={src.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-primary-400" />
                    <h3 className="font-semibold text-white">{src.name}</h3>
                    {src.free && <span className="badge-green">Free</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{src.game}</p>
                </div>
                {result && (
                  <div className={`flex items-center gap-1.5 text-xs ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {result.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {result.msg}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {src.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                    <input type="password" placeholder={f.placeholder}
                      value={configs[src.id]?.[f.key] ?? ''}
                      onChange={e => setField(src.id, f.key, e.target.value)}
                      className="input text-sm font-mono" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => testMutation.mutate(src.id)} disabled={testMutation.isPending}
                  className="btn-outline text-sm">Test Connection</button>
                <button onClick={() => saveMutation.mutate({ sourceId: src.id, config: configs[src.id] ?? {} })}
                  disabled={saveMutation.isPending} className="btn-primary text-sm">
                  <Save size={13} /> Save
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
