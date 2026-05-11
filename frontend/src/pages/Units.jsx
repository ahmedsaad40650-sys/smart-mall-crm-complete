import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Search, Filter, Building2, DollarSign, MapPin } from 'lucide-react'

function Units() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [formData, setFormData] = useState({
    unit_number: '',
    floor: '',
    area: '',
    rental_price: '',
    type: 'retail',
    status: 'available',
    description: ''
  })

  useEffect(() => {
    fetchUnits()
  }, [filterStatus])

  const fetchUnits = async () => {
    try {
      const url = filterStatus === 'all' ? '/units' : `/ units ? status = ${filterStatus} `
      const response = await api.get(url)
      setUnits(response.data.units || [])
    } catch (error) {
      toast.error('فشل تحميل الوحدات')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingUnit) {
        await api.put(`/ units / ${editingUnit.id} `, formData)
        toast.success('تم تحديث الوحدة بنجاح')
      } else {
        await api.post('/units', formData)
        toast.success('تم إضافة الوحدة بنجاح')
      }

      setShowModal(false)
      resetForm()
      fetchUnits()
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleEdit = (unit) => {
    setEditingUnit(unit)
    setFormData({
      unit_number: unit.unit_number,
      floor: unit.floor,
      area: unit.area,
      rental_price: unit.rental_price,
      type: unit.type,
      status: unit.status,
      description: unit.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return

    try {
      await api.delete(`/ units / ${id} `)
      toast.success('تم حذف الوحدة بنجاح')
      fetchUnits()
    } catch (error) {
      toast.error('فشل حذف الوحدة')
    }
  }

  const resetForm = () => {
    setFormData({
      unit_number: '',
      floor: '',
      area: '',
      rental_price: '',
      type: 'retail',
      status: 'available',
      description: ''
    })
    setEditingUnit(null)
  }

  const filteredUnits = units.filter(unit =>
    unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.floor.toString().includes(searchTerm)
  )

  const getStatusBadge = (status) => {
    const badges = {
      available: 'badge badge-success',
      rented: 'badge badge-warning',
      maintenance: 'badge badge-danger'
    }

    const labels = {
      available: 'متاحة',
      rented: 'مؤجرة',
      maintenance: 'صيانة'
    }

    return <span className={badges[status]}>{labels[status]}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* العنوان والبحث */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الوحدات التجارية</h1>
          <p className="text-gray-600 mt-1">إدارة الوحدات التجارية في المول</p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          إضافة وحدة جديدة
        </button>
      </div>

      {/* البحث والفلتر */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="البحث برقم الوحدة أو الطابق..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pr-10"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px - 4 py - 2 rounded - lg transition - colors ${filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                } `}
            >
              الكل ({units.length})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px - 4 py - 2 rounded - lg transition - colors ${filterStatus === 'available' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                } `}
            >
              متاحة
            </button>
            <button
              onClick={() => setFilterStatus('rented')}
              className={`px - 4 py - 2 rounded - lg transition - colors ${filterStatus === 'rented' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
                } `}
            >
              مؤجرة
            </button>
          </div>
        </div>
      </div>

      {/* قائمة الوحدات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">وحدة {unit.unit_number}</h3>
                  <p className="text-sm text-gray-600">الطابق {unit.floor}</p>
                </div>
              </div>
              {getStatusBadge(unit.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={16} />
                <span className="text-sm">المساحة: {unit.area} م²</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign size={16} />
                <span className="text-sm">الإيجار: {unit.rental_price.toLocaleString()} ريال/شهرياً</span>
              </div>
              <div className="text-sm text-gray-600">
                النوع: {unit.type === 'retail' ? 'تجزئة' : unit.type === 'office' ? 'مكتب' : 'خدمات'}
              </div>
            </div>

            {unit.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{unit.description}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(unit)}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                تعديل
              </button>
              <button
                onClick={() => handleDelete(unit.id)}
                className="flex-1 btn-danger flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">لا توجد وحدات</p>
        </div>
      )}

      {/* Modal إضافة/تعديل */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingUnit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">رقم الوحدة</label>
                  <input
                    type="text"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">الطابق</label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">المساحة (م²)</label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">الإيجار الشهري (ريال)</label>
                  <input
                    type="number"
                    value={formData.rental_price}
                    onChange={(e) => setFormData({ ...formData, rental_price: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">النوع</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="retail">تجزئة</option>
                    <option value="office">مكتب</option>
                    <option value="service">خدمات</option>
                  </select>
                </div>

                <div>
                  <label className="label">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="available">متاحة</option>
                    <option value="rented">مؤجرة</option>
                    <option value="maintenance">صيانة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  {editingUnit ? 'تحديث' : 'إضافة'}
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

export default Units
