import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, Receipt, Calendar, DollarSign, Search, AlertCircle } from 'lucide-react'

function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [tenants, setTenants] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    tenant_id: '',
    contract_id: '',
    amount: '',
    tax_amount: '',
    due_date: '',
    type: 'rent',
    description: ''
  })

  useEffect(() => {
    fetchInvoices()
    fetchTenants()
    fetchContracts()
  }, [filterStatus])

  const fetchInvoices = async () => {
    try {
      const url = filterStatus === 'all' ? '/invoices' : `/invoices?status=${filterStatus}`
      const response = await api.get(url)
      setInvoices(response.data.invoices || [])
    } catch (error) {
      toast.error('فشل تحميل الفواتير')
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

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts')
      setContracts(response.data.contracts || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await api.post('/invoices', formData)
      toast.success('تم إنشاء الفاتورة بنجاح')
      setShowModal(false)
      resetForm()
      fetchInvoices()
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ')
    }
  }

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      contract_id: '',
      amount: '',
      tax_amount: '',
      due_date: '',
      type: 'rent',
      description: ''
    })
  }

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    return tenant ? tenant.name : 'غير معروف'
  }

  const getStatusBadge = (invoice) => {
    const badges = {
      pending: 'badge-warning',
      partially_paid: 'badge-primary',
      paid: 'badge-success',
      overdue: 'badge-danger'
    }

    const labels = {
      pending: 'معلقة',
      partially_paid: 'مدفوعة جزئياً',
      paid: 'مدفوعة',
      overdue: 'متأخرة'
    }

    const status = invoice.status || 'pending'
    return <span className={`badge ${badges[status]}`}>{labels[status]}</span>
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTenantName(invoice.tenant_id).toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">الفواتير</h1>
          <p className="text-gray-600 mt-1">إدارة الفواتير والمستحقات</p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          إنشاء فاتورة جديدة
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="البحث برقم الفاتورة أو اسم المستأجر..."
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
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStatus === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
            >
              مدفوعة
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Receipt className="text-primary-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{invoice.invoice_number}</h3>
                    {getStatusBadge(invoice)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">المستأجر</p>
                      <p className="font-medium">{getTenantName(invoice.tenant_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">المبلغ</p>
                      <p className="font-medium text-primary-600">{invoice.total_amount.toLocaleString()} ريال</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">تاريخ الاستحقاق</p>
                      <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">النوع</p>
                      <p className="font-medium">{invoice.type === 'rent' ? 'إيجار' : 'أخرى'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">لا توجد فواتير</p>
        </div>
      )}

      {/* Modal إنشاء فاتورة */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">إنشاء فاتورة جديدة</h2>

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
                  <label className="label">العقد</label>
                  <select
                    value={formData.contract_id}
                    onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">اختر العقد</option>
                    {contracts.map(contract => (
                      <option key={contract.id} value={contract.id}>{contract.contract_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ الأساسي (ريال)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">الضريبة (ريال)</label>
                  <input
                    type="number"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                    <option value="rent">إيجار</option>
                    <option value="utilities">مرافق</option>
                    <option value="maintenance">صيانة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  إنشاء الفاتورة
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

export default Invoices
