import axios from 'axios'

// إعداد رابط API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// إنشاء instance من axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// إضافة interceptor للطلبات
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// إضافة interceptor للاستجابات
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // إزالة التوكن وإعادة التوجيه لصفحة تسجيل الدخول
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
