import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Plus, DollarSign, CreditCard, Calendar, Search, CheckCircle } from 'lucide-react'

function Payments() {
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    invoice_id: '',
    tenant_id: '',
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    notes: ''
  })

  useEffect(() => {
    fetchPayments()
    fetchInvoices()
    fetchTenants()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments')
      setPayments(response.data.payments || [])
    } catch (error) {
      toast.error('فشل تحميل المدفوعات')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices?status=pending')
      setInvoices(response.data.invoices || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await api.post('/payments', formData)
      toast.success('تم تسجيل الدفعة بنجاح')
      setShowModal(false)
      resetForm()
      fetchPayments()
      fetchInvoices() // Refresh to update pending invoices
    } catch (error) {
      toast.error(error.response?.data?.error || 'حدث خطأ')
    }
  }

  const resetForm = () => {
    setFormData({
      invoice_id: '',
      tenant_id: '',
      amount: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_id: '',
      notes: ''
    })
  }

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    return tenant ? tenant.name : 'غير معروف'
  }

  const getInvoiceNumber = (invoiceId) => {
    const invoice = [...invoices, ...payments.map(p => ({ id: p.invoice_id }))].find(i => i.id === invoiceId)
    return invoice ? invoice.invoice_number || invoiceId : 'غير معروف'
  }

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'نقدي',
      bank_transfer: 'تحويل بنكي',
      credit_card: 'بطاقة ائتمان',
      check: 'شيك'
    }
    return labels[method] || method
  }

  const filteredPayments = payments.filter(payment =>
    getTenantName(payment.tenant_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">المدفوعات</h1>
          <p className="text-gray-600 mt-1">تسجيل ومتابعة المدفوعات</p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          تسجيل دفعة جديدة
        </button>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="البحث برقم الدفعة أو اسم المستأجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredPayments.map((payment) => (
          <div key={payment.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12  h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-green-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{payment.payment_number}</h3>
                    <span className="badge badge-success">
                      <CheckCircle size={14} />
                      مكتملة
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">المستأجر</p>
                      <p className="font-medium">{getTenantName(payment.tenant_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">المبلغ</p>
                      <p className="font-medium text-green-600">{payment.amount.toLocaleString()} ريال</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">طريقة الدفع</p>
                      <p className="font-medium">{getPaymentMethodLabel(payment.payment_method)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">التاريخ</p>
                      <p className="font-medium">{new Date(payment.payment_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">لا توجد مدفوعات</p>
        </div>
      )}

      {/* Modal تسجيل دفعة */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">تسجيل دفعة جديدة</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">الفاتورة</label>
                  <select
                    value={formData.invoice_id}
                    onChange={(e) => {
                      const invoice = invoices.find(inv => inv.id === e.target.value)
                      setFormData({
                        ...formData,
                        invoice_id: e.target.value,
                        tenant_id: invoice ? invoice.tenant_id : '',
                        amount: invoice ? invoice.total_amount.toString() : ''
                      })
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">اختر الفاتورة</option>
                    {invoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - {invoice.total_amount.toLocaleString()} ريال
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المستأجر</label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="input-field"
                    required
                    disabled
                  >
                    <option value="">اختر المستأجر</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ (ريال)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">طريقة الدفع</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="input-field"
                  >
                    <option value="cash">نقدي</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="credit_card">بطاقة ائتمان</option>
                    <option value="check">شيك</option>
                  </select>
                </div>

                <div>
                  <label className="label">تاريخ الدفع</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">رقم المعاملة (اختياري)</label>
                  <input
                    type="text"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    className="input-field"
                  />
                </div>
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
                  تسجيل الدفعة
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

export default Payments
