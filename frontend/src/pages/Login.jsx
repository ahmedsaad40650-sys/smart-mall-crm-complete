import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Building2, Mail, Lock, LogIn } from 'lucide-react'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      toast.success('تم تسجيل الدخول بنجاح')
      navigate('/dashboard')
    } else {
      toast.error(result.error)
    }
    
    setLoading(false)
  }
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* شعار التطبيق */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg mb-4">
            <Building2 className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Mall CRM</h1>
          <p className="text-gray-600">Park St. Mall - نظام إدارة المولات الذكية</p>
        </div>
        
        {/* نموذج تسجيل الدخول */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">تسجيل الدخول</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">
                <Mail size={18} className="inline ml-2" />
                البريد الإلكتروني
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="example@smartmall.com"
                required
              />
            </div>
            
            <div>
              <label className="label">
                <Lock size={18} className="inline ml-2" />
                كلمة المرور
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>
          
          {/* معلومات الدخول التجريبي */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-2">بيانات الدخول التجريبية:</p>
            <p className="text-sm text-blue-700">البريد: admin@smartmall.com</p>
            <p className="text-sm text-blue-700">كلمة المرور: admin123</p>
          </div>
        </div>
        
        {/* تذييل */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>© 2024 Smart Mall CRM. جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  )
}

export default Login
