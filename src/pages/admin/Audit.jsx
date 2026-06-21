import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Search, Download } from 'lucide-react'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

const actionColors = {
  login: 'badge-blue', logout: 'badge-gray', register: 'badge-green',
  delete: 'badge-red', create: 'badge-green', update: 'badge-yellow',
  suspend: 'badge-red', activate: 'badge-green',
}

export default function AdminAudit() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', search, action],
    queryFn: () => api.get(`/admin/audit?search=${search}&action=${action}`).then(r => r.data),
    placeholderData: []
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-1">{logs.length} entries</p>
        </div>
        <button className="btn-outline flex items-center gap-1.5 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user or entity..." className="input pl-9" />
        </div>
        <select value={action} onChange={e => setAction(e.target.value)} className="input w-40">
          <option value="">All actions</option>
          {['login', 'logout', 'register', 'create', 'update', 'delete', 'suspend', 'activate'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="text-sm text-gray-300">{log.userEmail ?? log.userId?.slice(0, 8) ?? 'system'}</td>
                  <td><span className={actionColors[log.action] ?? 'badge-gray'}>{log.action}</span></td>
                  <td className="text-xs text-gray-500">{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</td>
                  <td className="text-xs text-gray-600 font-mono">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center text-sm text-gray-500 py-8">No audit entries found</p>}
        </div>
      )}
    </div>
  )
}
