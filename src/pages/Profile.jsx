import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, Shield, Save } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import Spinner from '../components/ui/Spinner'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const { toast } = useUIStore()
  const [form, setForm] = useState({ displayName: user?.displayName ?? '', email: user?.email ?? '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const profileMutation = useMutation({
    mutationFn: () => api.patch('/users/me', form),
    onSuccess: (res) => { setUser(res.data); toast.success('Profile updated!') },
    onError: () => toast.error('Update failed'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) throw new Error('Passwords do not match')
      return api.patch('/users/me/password', passwordForm)
    },
    onSuccess: () => { toast.success('Password changed!'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: (err) => toast.error(err.message ?? 'Failed to change password'),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="section-title">Profile Settings</h1>

      <div className="card space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full esport-gradient flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{user?.displayName?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{user?.displayName}</p>
            <span className={`badge capitalize ${user?.role === 'admin' ? 'badge-red' : user?.role === 'teacher' ? 'badge-blue' : 'badge-green'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Display Name</label>
            <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" className="input" />
          </div>
          <button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending} className="btn-primary">
            {profileMutation.isPending ? <Spinner size="sm" /> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Shield size={16} className="text-primary-400" /> Change Password</h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Current Password</label>
          <input type="password" value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">New Password</label>
          <input type="password" value={passwordForm.newPassword}
            onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Confirm New Password</label>
          <input type="password" value={passwordForm.confirmPassword}
            onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} className="input" />
        </div>
        <button onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending} className="btn-primary">
          {passwordMutation.isPending ? <Spinner size="sm" /> : 'Change Password'}
        </button>
      </div>
    </div>
  )
}
