import { create } from 'zustand'

export const useUIStore = create((set, get) => ({
  toasts: [],
  sidebarOpen: true,

  addToast: (toast) => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }))
    setTimeout(() => get().removeToast(id), toast.duration ?? 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toast: {
    success: (message) => get().addToast({ type: 'success', message }),
    error: (message) => get().addToast({ type: 'error', message }),
    info: (message) => get().addToast({ type: 'info', message }),
    warning: (message) => get().addToast({ type: 'warning', message }),
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
