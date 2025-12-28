import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  Building2,
  Users,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      toast.error('فشل تحميل الإحصائيات')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'إجمالي الوحدات',
      value: stats?.total_units || 0,
      icon: Building2,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'الوحدات المؤجرة',
      value: stats?.rented_units || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'الوحدات المتاحة',
      value: stats?.available_units || 0,
      icon: Building2,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'المستأجرين النشطين',
      value: stats?.active_tenants || 0,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'العقود النشطة',
      value: stats?.active_contracts || 0,
      icon: FileText,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      title: 'طلبات الصيانة المعلقة',
      value: stats?.pending_maintenance || 0,
      icon: Clock,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'الفواتير المعلقة',
      value: stats?.pending_invoices || 0,
      icon: Receipt,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: 'إجمالي الإيرادات',
      value: `${(stats?.total_revenue || 0).toLocaleString()} ريال`,
      icon: DollarSign,
      color: 'bg-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    }
  ]

  // بيانات نسبة الإشغال
  const occupancyData = [
    { name: 'مؤجرة', value: stats?.rented_units || 0, color: '#10b981' },
    { name: 'متاحة', value: stats?.available_units || 0, color: '#f59e0b' }
  ]

  // بيانات الفواتير
  const invoicesData = [
    { name: 'مدفوعة', count: stats?.paid_invoices || 0 },
    { name: 'معلقة', count: stats?.pending_invoices || 0 }
  ]

  const occupancyRate = stats?.total_units > 0
    ? ((stats.rented_units / stats.total_units) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-600 mt-1">نظرة عامة على نظام إدارة المول</p>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">معدل الإشغال</p>
          <p className="text-3xl font-bold text-primary-600">{occupancyRate}%</p>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="card hover:shadow-lg transition-shadow duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 0.1} s` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p - 3 rounded - lg`}>
                  <Icon className={stat.textColor} size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* رسم بياني لنسبة الإشغال */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">نسبة إشغال الوحدات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}% `}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {occupancyData.map((entry, index) => (
                  <Cell key={`cell - ${index} `} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* رسم بياني للفواتير */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">حالة الفواتير</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={invoicesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* تنبيهات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-1" size={24} />
            <div>
              <h4 className="font-bold text-yellow-900">طلبات الصيانة المعلقة</h4>
              <p className="text-yellow-700 text-sm mt-1">
                لديك {stats?.pending_maintenance || 0} طلب صيانة بحاجة للمتابعة
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <Receipt className="text-red-600 mt-1" size={24} />
            <div>
              <h4 className="font-bold text-red-900">فواتير معلقة</h4>
              <p className="text-red-700 text-sm mt-1">
                هناك {stats?.pending_invoices || 0} فاتورة بحاجة للتحصيل
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-green-600 mt-1" size={24} />
            <div>
              <h4 className="font-bold text-green-900">معدل التحصيل</h4>
              <p className="text-green-700 text-sm mt-1">
                معدل تحصيل الإيجارات ممتاز لهذا الشهر
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
