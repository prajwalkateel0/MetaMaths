import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import api from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); return }
    api.get(`/auth/verify?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="card text-center max-w-sm w-full">
        {status === 'loading' && <><Spinner size="md" className="mx-auto mb-4" /><p className="text-gray-400">Verifying your email...</p></>}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <h2 className="text-white font-semibold text-lg mb-2">Email verified!</h2>
            <p className="text-gray-400 text-sm mb-4">Your account is now active.</p>
            <Link to="/login" className="btn-primary w-full justify-center">Go to login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-white font-semibold text-lg mb-2">Verification failed</h2>
            <p className="text-gray-400 text-sm mb-4">The link may have expired. Please register again or contact support.</p>
            <Link to="/register" className="btn-outline w-full justify-center">Register again</Link>
          </>
        )}
      </div>
    </div>
  )
}
