import React, { useEffect } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { FullPageSpinner } from '../ui/Spinner'
import AppLayout from './AppLayout'

export default function ProtectedRoute({ role, children }) {
  const { user, accessToken, isLoading } = useAuthStore()

  if (!accessToken) return <Navigate to="/login" replace />
  if (isLoading) return <FullPageSpinner />

  if (role === 'any') return children

  if (role === 'admin' && user?.role !== 'admin') return <Navigate to="/login" replace />
  if (role === 'teacher' && !['teacher', 'admin'].includes(user?.role)) {
    if (user?.role === 'student') return <Navigate to="/s/dashboard" replace />
    return <Navigate to="/login" replace />
  }
  if (role === 'student' && user?.role !== 'student') {
    if (['teacher', 'admin'].includes(user?.role)) return <Navigate to="/t/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return <AppLayout><Outlet /></AppLayout>
}
