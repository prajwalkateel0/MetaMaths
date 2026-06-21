import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Upload, Globe, Database, Cloud, ChevronRight, CheckCircle, Link2, RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

const METHODS = [
  { id: 'csv', label: 'Upload CSV', icon: Upload, desc: 'Upload a .csv file (max 10 MB, 100k rows)' },
  { id: 'opendota', label: 'OpenDota (Dota 2)', icon: Globe, desc: 'Import player/match/hero stats from OpenDota API' },
  { id: 'riot', label: 'Riot Games', icon: Globe, desc: 'Import LoL match data with your API key' },
  { id: 'pandascore', label: 'PandaScore', icon: Database, desc: 'Import tournaments, teams, matches (LoL, CS2, Valorant)' },
  { id: 'gdrive', label: 'Google Drive', icon: Cloud, desc: 'Import from a Google Sheets spreadsheet' },
]

export default function DatasetNew() {
  const navigate = useNavigate()
  const { toast } = useUIStore()
  const [method, setMethod] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [apiParams, setApiParams] = useState({})
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  // Google Drive state
  const [gdriveTokens, setGdriveTokens] = useState(null)
  const [gdriveSheets, setGdriveSheets] = useState([])
  const [gdriveFileId, setGdriveFileId] = useState('')
  const [gdriveSheetName, setGdriveSheetName] = useState('')
  const [gdriveConnecting, setGdriveConnecting] = useState(false)
  const [gdriveLoadingSheets, setGdriveLoadingSheets] = useState(false)

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'gdrive-auth-success') {
        setGdriveTokens(e.data.tokens)
        setGdriveConnecting(false)
        loadSheets(e.data.tokens)
      }
      if (e.data?.type === 'gdrive-auth-error') {
        toast.error('Google Drive connection failed: ' + e.data.error)
        setGdriveConnecting(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const connectGoogle = async () => {
    setGdriveConnecting(true)
    try {
      const { data } = await api.get('/datasets/gdrive/auth-url')
      window.open(data.url, 'gdrive-oauth', 'width=600,height=700,left=200,top=100')
    } catch {
      toast.error('Failed to get Google auth URL')
      setGdriveConnecting(false)
    }
  }

  const loadSheets = async (tokens) => {
    setGdriveLoadingSheets(true)
    try {
      const { data } = await api.post('/datasets/gdrive/sheets', { tokens })
      setGdriveSheets(data.sheets ?? [])
    } catch {
      toast.error('Failed to load Google Sheets')
    } finally {
      setGdriveLoadingSheets(false)
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (method === 'csv') {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', title)
        fd.append('description', description)
        return api.post('/datasets/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      if (method === 'gdrive') {
        return api.post('/datasets/import/gdrive', { tokens: gdriveTokens, fileId: gdriveFileId, sheetName: gdriveSheetName, title, description })
      }
      const sourceMap = { opendota: 'api_opendota', riot: 'api_riot', pandascore: 'api_pandascore' }
      return api.post('/datasets/import/api', { source: sourceMap[method], params: apiParams, title, description })
    },
    onSuccess: (res) => {
      toast.success('Dataset imported successfully!')
      navigate(`/t/datasets/${res.data.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Import failed'),
  })

  if (!method) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="section-title">Import Dataset</h1>
          <p className="text-sm text-gray-400 mt-1">Choose a data source to get started.</p>
        </div>
        <div className="space-y-3">
          {METHODS.map(({ id, label, icon: Icon, desc }) => (
            <button key={id} onClick={() => setMethod(id)}
              className="w-full card-hover flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => { setMethod(null); setPreview(null) }} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1">
        ← Back to source selection
      </button>
      <h1 className="section-title">{METHODS.find(m => m.id === method)?.label}</h1>

      <div className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Dataset Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="e.g. OpenDota Pro Player Stats 2024" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="input resize-none" placeholder="Brief description..." />
        </div>

        {method === 'csv' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">CSV File *</label>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500/50 transition-colors">
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle size={20} /> <span className="text-sm">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <>
                  <Upload size={28} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload or drag & drop</p>
                  <p className="text-xs text-gray-600 mt-1">CSV up to 10 MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </div>
        )}

        {method === 'opendota' && (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-xs text-green-400 font-medium">✅ Free API — no key required</p>
              <p className="text-xs text-gray-500 mt-0.5">OpenDota provides free access to Dota 2 stats</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Data Type</label>
              <select className="input" defaultValue="heroStats" onChange={e => setApiParams(p => ({ ...p, queryType: e.target.value }))}>
                <option value="heroStats">Hero Statistics (win rates, stats) — best for class</option>
                <option value="proPlayers">Pro Players (win rates, teams)</option>
                <option value="proMatches">Pro Matches (recent results)</option>
                <option value="player">Individual Player Matches (enter ID below)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Player ID <span className="text-gray-600">(only for Individual Player)</span></label>
              <input className="input" placeholder="e.g. 86745912 — find at opendota.com/players" onChange={e => setApiParams(p => ({ ...p, playerId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Max records</label>
              <input type="number" defaultValue={50} min={10} max={100} className="input"
                onChange={e => setApiParams(p => ({ ...p, limit: e.target.value }))} />
            </div>
          </div>
        )}

        {method === 'pandascore' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400 font-medium">🔑 PandaScore API — key configured</p>
              <p className="text-xs text-gray-500 mt-0.5">LoL, CS2, Valorant, Dota 2, Rocket League</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Game</label>
              <select className="input" defaultValue="lol" onChange={e => setApiParams(p => ({ ...p, game: e.target.value }))}>
                <option value="lol">League of Legends</option>
                <option value="cs2">CS2</option>
                <option value="valorant">Valorant</option>
                <option value="dota2">Dota 2</option>
                <option value="rl">Rocket League</option>
                <option value="kog">King of Glory</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Data Type</label>
              <select className="input" defaultValue="teams" onChange={e => setApiParams(p => ({ ...p, dataType: e.target.value }))}>
                <option value="teams">Teams</option>
                <option value="players">Players</option>
                <option value="tournaments">Tournaments (prize pools, dates)</option>
                <option value="matches">Recent Matches (results)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Max records</label>
              <input type="number" defaultValue={50} min={10} max={100} className="input"
                onChange={e => setApiParams(p => ({ ...p, limit: e.target.value }))} />
            </div>
          </div>
        )}

        {method === 'riot' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400 font-medium">🔑 Riot Games API — key configured</p>
              <p className="text-xs text-gray-500 mt-0.5">League of Legends champion & summoner data</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Data Type</label>
              <select className="input" defaultValue="champions"
                onChange={e => setApiParams(p => ({ ...p, queryType: e.target.value }))}>
                <option value="champions">Champions (166 champions — stats, roles, HP, armor)</option>
                <option value="summoner">Summoner Match History (enter name below)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Summoner Name <span className="text-gray-600">(only for Match History)</span>
              </label>
              <input className="input" placeholder="e.g. Faker, T1Gumayusi"
                onChange={e => setApiParams(p => ({ ...p, summonerName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Region</label>
              <select className="input" defaultValue="euw1"
                onChange={e => setApiParams(p => ({ ...p, region: e.target.value }))}>
                <option value="euw1">EUW</option>
                <option value="eun1">EUNE</option>
                <option value="na1">NA</option>
                <option value="kr">KR</option>
                <option value="br1">BR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Max records</label>
              <select className="input" defaultValue="50"
                onChange={e => setApiParams(p => ({ ...p, limit: e.target.value }))}>
                <option value="20">20</option>
                <option value="50">50 (recommended)</option>
                <option value="100">100</option>
                <option value="166">All champions (166)</option>
              </select>
            </div>
          </div>
        )}

        {method === 'gdrive' && (
          <div className="space-y-4">
            {!gdriveTokens ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-700 rounded-xl">
                <Cloud size={32} className="text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-4">Connect your Google account to import from Sheets</p>
                <button type="button" onClick={connectGoogle} disabled={gdriveConnecting}
                  className="btn-primary flex items-center gap-2 mx-auto">
                  {gdriveConnecting ? <Spinner size="sm" /> : <Link2 size={14} />}
                  {gdriveConnecting ? 'Opening Google...' : 'Connect Google Account'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-sm text-green-300">Google account connected!</span>
                  <button onClick={() => { setGdriveTokens(null); setGdriveSheets([]) }}
                    className="ml-auto text-xs text-gray-500 hover:text-gray-300">Disconnect</button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-300">Select Spreadsheet</label>
                    <button onClick={() => loadSheets(gdriveTokens)} className="text-xs text-blue-400 flex items-center gap-1">
                      <RefreshCw size={11} /> Refresh
                    </button>
                  </div>
                  {gdriveLoadingSheets ? (
                    <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                  ) : (
                    <select className="input" value={gdriveFileId}
                      onChange={e => setGdriveFileId(e.target.value)}>
                      <option value="">Select a spreadsheet...</option>
                      {gdriveSheets.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {gdriveFileId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Sheet / Tab name <span className="text-gray-600">(leave blank for first sheet)</span>
                    </label>
                    <input className="input" placeholder="e.g. Sheet1, Data, Players"
                      value={gdriveSheetName} onChange={e => setGdriveSheetName(e.target.value)} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          onClick={() => uploadMutation.mutate()}
          disabled={uploadMutation.isPending || !title || (method === 'csv' && !file) || (method === 'gdrive' && (!gdriveTokens || !gdriveFileId))}
          className="btn-primary w-full h-10">
          {uploadMutation.isPending ? <Spinner size="sm" /> : 'Import Dataset'}
        </button>
      </div>
    </div>
  )
}
