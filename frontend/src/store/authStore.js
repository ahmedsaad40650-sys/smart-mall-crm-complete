import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password })
          const { access_token, user } = response.data

          set({
            user,
            token: access_token,
            isAuthenticated: true,
          })

          // حفظ التوكن في localStorage
          localStorage.setItem('token', access_token)

          return { success: true }
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.error || 'حدث خطأ في تسجيل الدخول'
          }
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      getCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data })
          return { success: true }
        } catch (error) {
          return { success: false }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
