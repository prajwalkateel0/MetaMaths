import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Gamepad2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'
import bgImage from '../../../back2.jpeg'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export default function Login() {
  const { login } = useAuthStore()
  const { toast } = useUIStore()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(data.email, data.password)
      toast.success(`Welcome back, ${user.displayName}!`)
      if (user.role === 'admin') navigate('/admin/dashboard')
      else if (user.role === 'teacher') navigate('/t/dashboard')
      else navigate('/s/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* dark overlay */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl esport-gradient items-center justify-center mb-4">
            <Gamepad2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to MetaMaths</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input {...register('email')} type="email" className={errors.email ? 'input-error' : 'input'} placeholder="teacher@school.ac.uk" />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input {...register('password')} type={showPass ? 'text' : 'password'} className={`${errors.password ? 'input-error' : 'input'} pr-10`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full h-10">
            {loading ? <Spinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="card mt-4 space-y-2">
          <p className="text-xs text-gray-500 font-medium mb-2">Demo accounts</p>
          {[
            { label: 'Teacher', email: 'teacher@demo.com', role: 'teacher' },
            { label: 'Student', email: 'student@demo.com', role: 'student' },
            { label: 'Admin', email: 'admin@demo.com', role: 'admin' },
          ].map(({ label, email, role }) => (
            <button key={role} onClick={() => { onSubmit({ email, password: 'demo1234' }) }}
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
              <span className="text-xs font-medium text-gray-300">{label}</span>
              <span className="text-xs text-gray-500 ml-2">{email}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">Register here</Link>
        </p>
      </div>
    </div>
  )
}
