import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export interface User {
  id: number
  email: string
  fullName: string
  role: number
  status: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
}

function getInitialState(): AuthState {
  if (browser) {
    try {
      const token = localStorage.getItem('admin_token')
      const userStr = localStorage.getItem('admin_user')
      const user = userStr ? JSON.parse(userStr) : null
      return { token, user, isAuthenticated: !!token && !!user }
    } catch { /* ignore */ }
  }
  return { token: null, user: null, isAuthenticated: false }
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(getInitialState())

  return {
    subscribe,
    login: (token: string, user: User) => {
      if (browser) {
        localStorage.setItem('admin_token', token)
        localStorage.setItem('admin_user', JSON.stringify(user))
      }
      set({ token, user, isAuthenticated: true })
    },
    logout: () => {
      if (browser) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
      }
      set({ token: null, user: null, isAuthenticated: false })
    },
    updateUser: (user: User) => {
      update(state => {
        if (browser) localStorage.setItem('admin_user', JSON.stringify(user))
        return { ...state, user }
      })
    },
  }
}

export const auth = createAuthStore()
