import React from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center p-4">
      <div>
        <div className="text-8xl font-black text-gray-800 mb-4">404</div>
        <Gamepad2 size={32} className="text-primary-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">This page doesn't exist or you don't have access.</p>
        <Link to="/" className="btn-primary"><Home size={16} /> Go Home</Link>
      </div>
    </div>
  )
}
