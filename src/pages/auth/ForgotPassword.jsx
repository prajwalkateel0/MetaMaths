import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, ArrowLeft, Mail } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

export default function ForgotPassword() {
  const { toast } = useUIStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl esport-gradient items-center justify-center mb-4">
            <Gamepad2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-gray-400 text-sm mt-1">We'll email you a reset link</p>
        </div>

        {sent ? (
          <div className="card text-center">
            <Mail size={32} className="text-primary-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Check your email</h3>
            <p className="text-sm text-gray-400 mb-4">We've sent a reset link to <strong className="text-gray-200">{email}</strong>. It expires in 1 hour.</p>
            <Link to="/login" className="btn-outline w-full justify-center">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="your@email.com" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full h-10">
              {loading ? <Spinner size="sm" /> : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mt-6 w-fit mx-auto">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </div>
  )
}
