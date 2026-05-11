import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { 
  Shield, Mail, Lock, LogIn, Eye, EyeOff, CheckCircle, 
  Sparkles, ChevronRight
} from 'lucide-react'
import { Button } from '../components/ui/Button'

function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    const savedEmail = localStorage.getItem('smartmall_remember_email')
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    setLoading(true)

    if (rememberMe) {
      localStorage.setItem('smartmall_remember_email', formData.email)
    } else {
      localStorage.removeItem('smartmall_remember_email')
    }

    const result = await login(formData.email, formData.password)

    if (result.success) {
      toast.success('تمت المصادقة بنجاح!')
      const canViewDashboard = useAuthStore.getState().can('dashboard.view')
      const canViewPortal = useAuthStore.getState().can('portal.view')

      if (canViewDashboard) {
        navigate('/dashboard')
      } else if (canViewPortal) {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } else {
      toast.error(result.error || 'فشل تسجيل الدخول')
    }

    setLoading(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 lg:p-12 relative" dir="rtl">
      <div className="w-full max-w-6xl z-10 grid lg:grid-cols-2 gap-12 items-center">
        
        {/* 💎 1. BRANDING & SECURITY FEATURES 💎 */}
        <div className="hidden lg:flex flex-col items-start gap-12 text-white animate-fade-in pl-12">
            <div className="space-y-6">
               <div className="w-24 h-24 bg-white/10 flex items-center justify-center rounded-2xl rotate-3 shadow-lg">
                  <Shield size={48} className="text-white" />
               </div>
               <div className="space-y-2">
                  <h1 className="text-6xl font-black italic uppercase font-display tracking-tight text-white glow-luxury">Smart Mall</h1>
                  <p className="text-xl font-bold text-white/80 uppercase tracking-[0.2em] font-display">Security Management Suite</p>
               </div>
            </div>
        </div>

        {/* 💎 2. LOGIN CARD 💎 */}
        <div className="w-full max-w-md mx-auto animate-slide-up">
           <div className="card card-luxury p-10 lg:p-12">
                             <div className="text-center lg:text-right space-y-2 mb-10">
                  <h2 className="text-3xl font-black italic font-display uppercase tracking-tight text-black">تسجيل الدخول</h2>
                  <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-slate-500">DIAMOND AUTH PROTOCOL</p>
               </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="space-y-6">
                    <div>
                       <label className="label">البريد الإلكتروني</label>
                       <div className="input-wrapper">
                          <input 
                            type="email" 
                            name="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            className="input-field has-icon" 
                            placeholder="name@smartmall.com" 
                            required 
                          />
                          <Mail size={20} className="input-icon" />
                       </div>
                    </div>

                    <div>
                       <label className="label">كلمة المرور</label>
                       <div className="input-wrapper group relative">
                          <input 
                            type={showPassword ? 'text' : 'password'} 
                            name="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            className="input-field has-icon pl-12" 
                            placeholder="••••••••" 
                            required 
                          />
                          <Lock size={20} className="input-icon" />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors z-10"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                       </div>
                    </div>
                 </div>

                  <div className="flex items-center justify-between px-2">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="hidden" />
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${rememberMe ? 'bg-purple-600 border-purple-600 shadow-lg' : 'bg-slate-50 border-slate-200'}`}>
                           {rememberMe && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest group-hover:text-black transition-colors">تذكرني</span>
                     </label>
                     <Link to="/forgot-password" name="forgot-password" className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors">نسيت كلمة المرور؟</Link>
                  </div>

                 <Button type="submit" variant="primary" size="lg" className="w-full" icon={<LogIn size={20} />} disabled={loading}>
                    {loading ? 'جاري التحقق...' : 'تسجيل الدخول الآمن'}
                 </Button>
              </form>

               <div className="mt-8 pt-6 border-t border-black/5 text-center space-y-4">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">ليس لديك حساب؟</p>
                  <Link to="/register" className="inline-flex items-center gap-3 text-slate-600 hover:text-black transition-all font-black uppercase tracking-widest text-[12px] group">
                     <Sparkles size={16} className="text-purple-600 group-hover:scale-125 transition-transform" />
                     إنشاء حساب جديد
                     <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-2 transition-transform" />
                  </Link>
               </div>
           </div>

           <div className="text-center mt-8 text-gray-600 text-[9px] font-black uppercase tracking-[0.4em]">
              © 2026 SMART MALL CRM · SECURED BY DIAMOND UI
           </div>
        </div>
      </div>
    </div>
  )
}

export default Login
