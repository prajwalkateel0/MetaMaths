import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      setAccessToken: (token) => {
        localStorage.setItem('accessToken', token)
        set({ accessToken: token })
      },

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          localStorage.setItem('accessToken', data.accessToken)
          set({ user: data.user, accessToken: data.accessToken, isLoading: false })
          return data.user
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        localStorage.removeItem('accessToken')
        set({ user: null, accessToken: null })
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data })
        } catch {
          set({ user: null, accessToken: null })
          localStorage.removeItem('accessToken')
        }
      },

      isAuthenticated: () => !!get().accessToken,
      isTeacher: () => ['teacher', 'admin'].includes(get().user?.role),
      isAdmin: () => get().user?.role === 'admin',
      isStudent: () => get().user?.role === 'student',
    }),
    { name: 'metamaths-auth', partialize: (s) => ({ accessToken: s.accessToken, user: s.user }) }
  )
)
