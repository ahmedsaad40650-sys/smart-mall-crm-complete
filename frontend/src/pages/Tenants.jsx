import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Search, Users, Mail, Phone, Briefcase } from 'lucide-react'

function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: '',
    business_type: '',
    tax_id: '',
    address: '',
    status: 'active',
    notes: ''
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await api.get('/tenants')
      setTenants(response.data.tenants || [])
    } catch (error) {
      toast.error('فشل تحميل المستأجرين')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingTenant) {
        await api.put(`/tenants/${editingTenant.id}`, formData)
        toast.success('تم تحديث المستأجر بنجاح')
      } else {
        await api.post('/tenants', formData)
        toast.success('تم إضافة المستأجر بنجاح')
      }

      setShowModal(false)
      resetForm()
      fetchTenants()
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ')
    }
  }

  const handleEdit = (tenant) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      business_name: tenant.business_name,
      business_type: tenant.business_type || '',
      tax_id: tenant.tax_id || '',
      address: tenant.address || '',
      status: tenant.status,
      notes: tenant.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('هل أن متأكد من حذف هذا المستأجر؟')) return

    try {
      await api.delete(`/tenants/${id}`)
      toast.success('تم حذف المستأجر بنجاح')
      fetchTenants()
    } catch (error) {
      toast.error('فشل حذف المستأجر')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      business_name: '',
      business_type: '',
      tax_id: '',
      address: '',
      status: 'active',
      notes: ''
    })
    setEditingTenant(null)
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* العنوان والبحث */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المستأجرين</h1>
          <p className="text-gray-600 mt-1">إدارة المستأجرين والتجار</p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          إضافة مستأجر جديد
        </button>
      </div>

      {/* البحث */}
      <div className="card">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="البحث بالاسم، البريد الإلكتروني، أو اسم النشاط..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </div>

      {/* قائمة المستأجرين */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{tenant.name}</h3>
                  <p className="text-sm text-gray-600">{tenant.business_name}</p>
                </div>
              </div>
              <span className={`badge ${tenant.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                {tenant.status === 'active' ? 'نشط' : 'غير نشط'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={16} />
                <span className="text-sm">{tenant.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={16} />
                <span className="text-sm">{tenant.phone}</span>
              </div>
              {tenant.business_type && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase size={16} />
                  <span className="text-sm">{tenant.business_type}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(tenant)}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                تعديل
              </button>
              <button
                onClick={() => handleDelete(tenant.id)}
                className="flex-1 btn-danger flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">لا يوجد مستأجرين</p>
        </div>
      )}

      {/* Modal إضافة/تعديل */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingTenant ? 'تعديل المستأجر' : 'إضافة مستأجر جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">الاسم</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">اسم النشاط التجاري</label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">نوع النشاط</label>
                  <input
                    type="text"
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">الرقم الضريبي</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">العنوان</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  {editingTenant ? 'تحديث' : 'إضافة'}
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

export default Tenants
