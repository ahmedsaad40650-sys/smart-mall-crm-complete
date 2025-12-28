import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, Wrench, AlertCircle, Clock, CheckCircle, Search } from 'lucide-react'

function Maintenance() {
  const [requests, setRequests] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    unit_id: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    notes: ''
  })

  useEffect(() => {
    fetchRequests()
    fetchUnits()
  }, [filterStatus])

  const fetchRequests = async () => {
    try {
      const url = filterStatus === 'all' ? '/maintenance' : `/maintenance?status=${filterStatus}`
      const response = await api.get(url)
      setRequests(response.data.requests || [])
    } catch (error) {
      toast.error('فشل تحميل طلبات الصيانة')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      const response = await api.get('/units')
      setUnits(response.data.units || [])
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await api.post('/maintenance', formData)
      toast.success('تم إنشاء طلب الصيانة بنجاح')
      setShowModal(false)
      resetForm()
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}`, { status })
      toast.success('تم تحديث حالة الطلب')
      fetchRequests()
    } catch (error) {
      toast.error('فشل تحديث الحالة')
    }
  }

  const resetForm = () => {
    setFormData({
      unit_id: '',
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      notes: ''
    })
  }

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId)
    return unit ? `وحدة ${unit.unit_number}` : 'غير معروف'
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    }
    const labels = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية'
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[priority]}`}>{labels[priority]}</span>
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', label: 'معلقة', icon: Clock },
      in_progress: { class: 'badge-primary', label: 'جارية', icon: Wrench },
      completed: { class: 'badge-success', label: 'مكتملة', icon: CheckCircle }
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`badge ${badge.class} flex items-center gap-1`}>
        <Icon size={14} />
        {badge.label}
      </span>
    )
  }

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">طلبات الصيانة</h1>
          <p className="text-gray-600 mt-1">إدارة طلبات الصيانة والإصلاحات</p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          طلب صيانة جديد
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="البحث في الطلبات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pr-10"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
            >
              معلقة
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
            >
              مكتملة
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.map((request) => (
          <div key={request.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Wrench className="text-orange-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{request.title}</h3>
                  <p className="text-sm text-gray-600">{getUnitNumber(request.unit_id)} - {request.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(request.priority)}
                {getStatusBadge(request.status)}
              </div>
            </div>

            <p className="text-gray-600 mb-4">{request.description}</p>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-500">
                {new Date(request.reported_at).toLocaleDateString('ar-SA')}
              </div>

              {request.status !== 'completed' && (
                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(request.id, 'in_progress')}
                      className="btn-primary text-sm"
                    >
                      بدء العمل
                    </button>
                  )}
                  {request.status === 'in_progress' && (
                    <button
                      onClick={() => updateStatus(request.id, 'completed')}
                      className="btn-success text-sm"
                    >
                      إكمال
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">لا توجد طلبات صيانة</p>
        </div>
      )}

      {/* Modal إضافة طلب */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">طلب صيانة جديد</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">الوحدة</label>
                <select
                  value={formData.unit_id}
                  onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">اختر الوحدة</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>وحدة {unit.unit_number} - الطابق {unit.floor}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">العنوان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="4"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">الفئة</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="general">عامة</option>
                    <option value="electrical">كهرباء</option>
                    <option value="plumbing">سباكة</option>
                    <option value="hvac">تكييف</option>
                    <option value="cleaning">نظافة</option>
                  </select>
                </div>

                <div>
                  <label className="label">الأولوية</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  إنشاء الطلب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1 btn-secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Maintenance
