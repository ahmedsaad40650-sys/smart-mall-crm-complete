import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, FileText, Calendar, DollarSign, Search } from 'lucide-react'

function Contracts() {
  const [contracts, setContracts] = useState([])
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    tenant_id: '',
    unit_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    deposit: '',
    payment_day: 1,
    terms: '',
    notes: ''
  })

  useEffect(() => {
    fetchContracts()
    fetchTenants()
    fetchUnits()
  }, [])

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts')
      setContracts(response.data.contracts || [])
    } catch (error) {
      toast.error('فشل تحميل العقود')
    } finally {
      setLoading(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const response = await api.get('/tenants')
      setTenants(response.data.tenants || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  const fetchUnits = async () => {
    try {
      const response = await api.get('/units?status=available')
      setUnits(response.data.units || [])
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await api.post('/contracts', formData)
      toast.success('تم إنشاء العقد بنجاح')
      setShowModal(false)
      resetForm()
      fetchContracts()
      fetchUnits() // Refresh to update available units
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ')
    }
  }

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      unit_id: '',
      start_date: '',
      end_date: '',
      monthly_rent: '',
      deposit: '',
      payment_day: 1,
      terms: '',
      notes: ''
    })
  }

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    return tenant ? tenant.name : 'غير معروف'
  }

  const getUnitNumber = (unitId) => {
    const unit = [...units, ...contracts.map(c => ({ id: c.unit_id }))].find(u => u.id === unitId)
    return unit ? `وحدة ${unit.unit_number || unitId}` : 'غير معروف'
  }

  const filteredContracts = contracts.filter(contract =>
    getTenantName(contract.tenant_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">العقود</h1>
          <p className="text-gray-600 mt-1">إدارة عقود الإيجار</p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          إضافة عقد جديد
        </button>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="البحث برقم العقد أو اسم المستأجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredContracts.map((contract) => (
          <div key={contract.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-primary-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{contract.contract_number}</h3>
                    <span className={`badge ${contract.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {contract.status === 'active' ? 'نشط' : contract.status === 'expired' ? 'منتهي' : 'ملغي'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">المستأجر</p>
                      <p className="font-medium">{getTenantName(contract.tenant_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الوحدة</p>
                      <p className="font-medium">{getUnitNumber(contract.unit_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الإيجار الشهري</p>
                      <p className="font-medium text-primary-600">{contract.monthly_rent.toLocaleString()} ريال</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">المدة</p>
                      <p className="font-medium">{new Date(contract.start_date).toLocaleDateString('ar-SA')} - {new Date(contract.end_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">لا توجد عقود</p>
        </div>
      )}

      {/* Modal إضافة عقد */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">إضافة عقد جديد</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">المستأجر</label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">اختر المستأجر</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </select>
                </div>

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
                      <option key={unit.id} value={unit.id}>وحدة {unit.unit_number} - {unit.rental_price} ريال</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">تاريخ البداية</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">الإيجار الشهري (ريال)</label>
                  <input
                    type="number"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">التأمين (ريال)</label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">يوم الدفع الشهري</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payment_day}
                    onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">الشروط والأحكام</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="input-field"
                  rows="3"
                />
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
                  إنشاء العقد
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

export default Contracts
