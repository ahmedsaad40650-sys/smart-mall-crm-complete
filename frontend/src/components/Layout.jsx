import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Wrench,
  Receipt,
  CreditCard,
  FileCheck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

function Layout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const navigation = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
    { name: 'الوحدات التجارية', href: '/units', icon: Building2 },
    { name: 'المستأجرين', href: '/tenants', icon: Users },
    { name: 'العقود', href: '/contracts', icon: FileText },
    { name: 'طلبات الصيانة', href: '/maintenance', icon: Wrench },
    { name: 'الفواتير', href: '/invoices', icon: Receipt },
    { name: 'المدفوعات', href: '/payments', icon: CreditCard },
    { name: 'التصاريح', href: '/permits', icon: FileCheck },
    { name: 'التقارير', href: '/reports', icon: BarChart3 },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
  ]
  
  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }
  
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-white shadow-sm fixed top-0 right-0 left-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smart Mall CRM</h1>
                <p className="text-xs text-gray-500">Park St. Mall</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      
      {/* الشريط الجانبي */}
      <aside className={`
        fixed top-16 right-0 bottom-0 w-64 bg-white shadow-lg transform transition-transform duration-300 z-20
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <nav className="p-4 space-y-1 overflow-y-auto h-full">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
      
      {/* المحتوى الرئيسي */}
      <main className="lg:mr-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      
      {/* Overlay للشاشات الصغيرة */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout
