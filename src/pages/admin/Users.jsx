import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Shield, UserX, UserCheck, Key } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

const roleColors = { admin: 'badge-red', teacher: 'badge-blue', student: 'badge-green' }

export default function AdminUsers() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => api.get(`/admin/users?search=${search}&role=${roleFilter}`).then(r => r.data),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/admin/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User updated') },
    onError: () => toast.error('Update failed'),
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">{users.length} users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="input pl-9" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-36">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-xs text-gray-300">{u.displayName?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-200 font-medium">{u.displayName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={roleColors[u.role] ?? 'badge-gray'}>{u.role}</span>
                  </td>
                  <td>
                    <span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'active' : 'suspended'}</span>
                  </td>
                  <td className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => patchMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                        className="btn-ghost p-1.5" title={u.isActive ? 'Suspend' : 'Activate'}>
                        {u.isActive ? <UserX size={13} className="text-red-400" /> : <UserCheck size={13} className="text-green-400" />}
                      </button>
                      <button onClick={() => patchMutation.mutate({ id: u.id, data: { forcePasswordReset: true } })}
                        className="btn-ghost p-1.5" title="Force password reset">
                        <Key size={13} className="text-yellow-400" />
                      </button>
                      <select defaultValue={u.role} onChange={e => patchMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                        className="text-xs bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-gray-300">
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center text-sm text-gray-500 py-8">No users found</p>}
        </div>
      )}
    </div>
  )
}
