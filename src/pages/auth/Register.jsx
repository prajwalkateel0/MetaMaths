import React, { useState } from 'react'
import bgImage from '../../../signnup.jpeg'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Gamepad2, Eye, EyeOff, GraduationCap, BookOpen } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import Spinner from '../../components/ui/Spinner'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must include uppercase')
    .regex(/[0-9]/, 'Must include number'),
  role: z.enum(['teacher', 'student']),
})

export default function Register() {
  const navigate = useNavigate()
  const { toast } = useUIStore()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'teacher' }
  })

  const role = watch('role')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await api.post('/auth/register', data)
      toast.success('Account created! Check your email to verify.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl esport-gradient items-center justify-center mb-4">
            <Gamepad2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 text-sm mt-1">Join MetaMaths today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'teacher', label: 'Teacher', icon: GraduationCap }, { value: 'student', label: 'Student', icon: BookOpen }].map(({ value, label, icon: Icon }) => (
                <button type="button" key={value}
                  onClick={() => setValue('role', value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium
                    ${role === value ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
            <input {...register('displayName')} className={errors.displayName ? 'input-error' : 'input'} placeholder="Jane Smith" />
            {errors.displayName && <p className="text-xs text-red-400 mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input {...register('email')} type="email" className={errors.email ? 'input-error' : 'input'} placeholder="jane@school.ac.uk" />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input {...register('password')} type={showPass ? 'text' : 'password'} className={`${errors.password ? 'input-error' : 'input'} pr-10`} placeholder="Min 8 chars, uppercase, number" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full h-10">
            {loading ? <Spinner size="sm" /> : 'Create Account'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By registering you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
