import { useEffect, useState, useMemo } from 'react'
import firestoreService from '../services/firestoreService'
import toast from 'react-hot-toast'
import { 
  CreditCard, Search, DollarSign, Calendar, Eye, 
  Download, Filter, ArrowUpRight, ArrowDownRight, Printer, CheckCircle,
  X, FileText, Wallet, Landmark, History, Receipt, Edit, Trash2
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import PermissionGate from '../components/PermissionGate'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../services/translations'

// Helper component for modern payment receipt
const PaymentReceipt = ({ payment, invoice, tenant, onClose }) => {
  const { currentLanguage: lang } = useLanguage()
  
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content-diamond print:shadow-none print:border-none print:bg-white print:text-black" style={{ maxWidth: '550px' }}>
        
        {/* Receipt Header */}
        <div className="modal-header-diamond border-b-0 mb-8">
          <div>
            <h2 className="modal-title-diamond" style={{ fontSize: '24px' }}>Smart Mall CRM</h2>
            <p style={{ fontSize: '11px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
              {lang === 'ar' ? 'إيصال استلام نقدية' : 'Financial Revenue Receipt'}
            </p>
          </div>
          <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }} className="print:hidden">
            <button className="modal-close-diamond" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="gg" style={{ padding: '32px', borderRadius: '24px', position: 'relative', marginBottom: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                 <div style={{ fontSize: '10px', color: 'var(--txt3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{lang === 'ar' ? 'بواسطة' : 'RECEIVED FROM'}</div>
                 <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--txt)' }}>{tenant?.name || '---'}</div>
                 <div style={{ fontSize: '12px', color: 'var(--txt3)', marginTop: '2px' }}>{tenant?.business_name || ''}</div>
              </div>
              <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                 <div style={{ fontSize: '10px', color: 'var(--txt3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{lang === 'ar' ? 'المبلغ' : 'TOTAL AMOUNT'}</div>
                 <div className="num" style={{ fontSize: '32px', fontWeight: 900, color: 'var(--green)' }}>
                   {Number(payment.amount).toLocaleString()} <span style={{ fontSize: '14px' }}>ج.م</span>
                 </div>
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                 <div style={{ fontSize: '10px', color: 'var(--txt3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{lang === 'ar' ? 'طريقة الدفع' : 'METHOD'}</div>
                 <div style={{ fontWeight: 800 }}>{payment.method === 'cash' ? 'نقدي' : payment.method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}</div>
              </div>
              <div>
                 <div style={{ fontSize: '10px', color: 'var(--txt3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{lang === 'ar' ? 'المرجع' : 'REFERENCE'}</div>
                 <div className="num" style={{ fontWeight: 800 }}>{payment.reference || '--'}</div>
              </div>
           </div>

           <div style={{ paddingTop: '24px', borderTop: '1px solid var(--bdr)' }}>
              <div style={{ fontSize: '10px', color: 'var(--txt3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>{lang === 'ar' ? 'البيان' : 'ALLOCATION'}</div>
              <div style={{ fontSize: '13px', color: 'var(--txt)', lineHeight: '1.6', fontWeight: 500 }}>
                {payment.description || (lang === 'ar' ? `دفعة كاملة للفاتورة #${invoice?.invoice_number}` : `Full settlement for Invoice #${invoice?.invoice_number}`)}
              </div>
           </div>

           {/* Watermark Logo */}
           <div style={{ position: 'absolute', bottom: '20px', left: lang === 'ar' ? '20px' : 'auto', right: lang === 'ar' ? 'auto' : '20px', opacity: 0.05 }}>
              <Receipt size={80} />
           </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', gap: '12px' }} className="print:hidden">
          <button className="ftb" style={{ flex: 1, height: '44px' }} onClick={onClose}>{lang === 'ar' ? 'إغلاق' : 'Close'}</button>
          <button className="btn" style={{ flex: 2, height: '44px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }} onClick={handlePrint}>
            <Printer size={18} />
            {lang === 'ar' ? 'طباعة الإيصال' : 'Print Protocol'}
          </button>
        </div>

        <div className="hidden print:block text-center mt-8 pt-6 border-t border-gray-100 text-gray-400 text-[10px] uppercase tracking-widest">
          Digitally Signed & Verified System Receipt • Smart Mall CRM v2.1
        </div>
      </div>
    </div>
  )
}

export default function Payments() {
  const { user } = useAuthStore()
  const { currentLanguage: lang } = useLanguage()
  const t = translations[lang]

  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMethod, setFilterMethod] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [editingPayment, setEditingPayment] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    amount: '', method: 'cash', reference: '', description: ''
  })

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const filters = []
      if (user?.role?.toLowerCase() === 'tenant') {
        filters.push({ field: 'tenantId', operator: '==', value: user.id })
      }
      
      const [paymentsData, invoicesData, tenantsData] = await Promise.all([
        firestoreService.getAll('payments', filters),
        firestoreService.getAll('invoices'),
        firestoreService.getAll('tenants')
      ])

      setPayments(paymentsData?.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) || [])
      setInvoices(invoicesData || [])
      setTenants(tenantsData || [])
    } catch (error) {
      console.error('Error loading payments:', error)
      toast.error(lang === 'ar' ? 'حدث خطأ في تحميل المدفوعات' : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (payment) => {
    setEditingPayment(payment)
    setEditFormData({
      amount: payment.amount || '',
      method: payment.method || 'cash',
      reference: payment.reference || '',
      description: payment.description || ''
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await firestoreService.update('payments', editingPayment.id, {
        amount: parseFloat(editFormData.amount),
        method: editFormData.method,
        reference: editFormData.reference,
        description: editFormData.description,
        updatedAt: new Date().toISOString()
      })
      toast.success(lang === 'ar' ? 'تم تعديل الدفعة بنجاح' : 'Payment updated successfully')
      setShowEditModal(false)
      setEditingPayment(null)
      fetchData()
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في تعديل الدفعة' : 'Failed to update payment')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this payment? This action cannot be undone.')) return
    try {
      await firestoreService.delete('payments', id)
      toast.success(lang === 'ar' ? 'تم حذف الدفعة بنجاح' : 'Payment deleted successfully')
      fetchData()
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في حذف الدفعة' : 'Failed to delete payment')
    }
  }

  const getTenantName = (id) => tenants.find(t => t.id === id)?.name || (lang === 'ar' ? 'غير معروف' : 'Unknown')
  const getInvoiceNumber = (id) => invoices.find(i => i.id === id)?.invoice_number || '--'

  const filteredPayments = useMemo(() => {
    let result = payments
    if (searchTerm) {
      result = result.filter(p => 
        getTenantName(p.tenantId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterMethod !== 'all') {
      result = result.filter(p => p.method === filterMethod)
    }
    if (dateRange !== 'all') {
      const now = new Date()
      const d = new Date()
      if (dateRange === 'month') d.setMonth(now.getMonth() - 1)
      if (dateRange === 'week') d.setDate(now.getDate() - 7)
      if (dateRange === 'today') d.setHours(0,0,0,0)
      result = result.filter(p => new Date(p.createdAt) >= d)
    }
    return result
  }, [payments, searchTerm, filterMethod, dateRange, tenants])

  const stats = useMemo(() => {
    const total = filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const count = filteredPayments.length
    const cash = filteredPayments.filter(p => p.method === 'cash').reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const bank = filteredPayments.filter(p => p.method === 'bank_transfer').reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    return { total, count, cash, bank }
  }, [filteredPayments])

  const exportToCSV = () => {
    const headers = lang === 'ar' 
      ? ['التاريخ', 'المستأجر', 'رقم الفاتورة', 'المبلغ', 'طريقة الدفع', 'المرجع', 'البيان']
      : ['Date', 'Tenant', 'Invoice No', 'Amount', 'Method', 'Reference', 'Description']
      
    const data = filteredPayments.map(p => [
      new Date(p.createdAt).toLocaleDateString('ar-EG'),
      getTenantName(p.tenantId),
      getInvoiceNumber(p.invoiceId),
      p.amount,
      p.method === 'cash' ? 'نقدي' : p.method === 'bank_transfer' ? 'بنكي' : 'شيك',
      p.reference || '',
      p.description || ''
    ])

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <Wallet size={24} />
          </div>
          <div>
            <h2>{t.payments_page.title}</h2>
            <span>{t.payments_page.subtitle}</span>
          </div>
        </div>
        <PermissionGate action="payments.export">
          <button className="btn" onClick={exportToCSV}>
            <Download size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
            {lang === 'ar' ? 'تصدير التقرير' : 'Export Ledger'}
          </button>
        </PermissionGate>
      </div>

      {/* Stats Overview */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="sc bl gc">
          <div className="si2"><History /></div>
          <div className="sv num">{(stats.total / 1000).toFixed(1)}K</div>
          <div className="sl">{t.payments_page.total_payments}</div>
        </div>
        <div className="sc pu gc">
          <div className="si2"><Receipt /></div>
          <div className="sv num">{stats.count}</div>
          <div className="sl">{lang === 'ar' ? 'عدد الحركات' : 'Txn Count'}</div>
        </div>
        <div className="sc gn gc">
          <div className="si2"><DollarSign /></div>
          <div className="sv num">{(stats.cash / 1000).toFixed(1)}K</div>
          <div className="sl">{lang === 'ar' ? 'تحصيلات نقدية' : 'Cash Collected'}</div>
        </div>
        <div className="sc or gc">
          <div className="si2"><Landmark /></div>
          <div className="sv num">{(stats.bank / 1000).toFixed(1)}K</div>
          <div className="sl">{lang === 'ar' ? 'تحويلات بنكية' : 'Bank Transfers'}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder={lang === 'ar' ? 'البحث باسم المستأجر أو المرجع...' : 'Search tenant or reference...'} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="ft">
          {['all', 'cash', 'bank_transfer'].map(s => (
            <button 
              key={s} 
              className={`ftb ${filterMethod === s ? 'active' : ''}`} 
              onClick={() => setFilterMethod(s)}
            >
              {{ all: t.common.all, cash: lang === 'ar' ? 'نقدي' : 'Cash', bank_transfer: lang === 'ar' ? 'بنكي' : 'Bank' }[s]}
            </button>
          ))}
        </div>
        <div className="ft">
          {['all', 'today', 'week', 'month'].map(s => (
            <button 
              key={s} 
              className={`ftb ${dateRange === s ? 'active' : ''}`} 
              onClick={() => setDateRange(s)}
            >
              {{ all: lang === 'ar' ? 'كل الوقت' : 'All Time', today: lang === 'ar' ? 'اليوم' : 'Today', week: lang === 'ar' ? 'أسبوع' : 'Week', month: lang === 'ar' ? 'شهر' : 'Month' }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="gc" style={{ overflow: 'hidden' }}>
        <table className="dt">
          <thead>
            <tr>
              <th>{t.fields.date}</th>
              <th>{t.payments_page.tenant}</th>
              <th>{t.payments_page.amount}</th>
              <th>{t.payments_page.method}</th>
              <th>{lang === 'ar' ? 'الفاتورة' : 'Invoice'}</th>
              <th>{t.fields.description}</th>
              <th style={{ textAlign: 'center' }}>{t.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map(payment => (
              <tr key={payment.id}>
                <td className="num" style={{ fontSize: '11px' }}>
                  {new Date(payment.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td style={{ fontWeight: 600 }}>{getTenantName(payment.tenantId)}</td>
                <td className="num" style={{ fontWeight: 800, color: 'var(--green)' }}>{Number(payment.amount).toLocaleString()}</td>
                <td>
                  <span className={`bs ${payment.method === 'cash' ? 'active' : 'warn'}`}>
                    {payment.method === 'cash' ? (lang === 'ar' ? 'نقدي' : 'Cash') : (lang === 'ar' ? 'بنكي' : 'Bank')}
                  </span>
                </td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--gold)' }}>#{getInvoiceNumber(payment.invoiceId)}</td>
                <td style={{ fontSize: '11px', color: 'var(--txt3)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {payment.description || '--'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button className="hb" onClick={() => setSelectedReceipt(payment)} title={lang === 'ar' ? 'عرض الإيصال' : 'View Receipt'}>
                       <Eye size={14} />
                    </button>
                    <PermissionGate action="payments.edit">
                      <button className="hb" style={{ color: 'var(--blue)' }} onClick={() => handleEdit(payment)} title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                        <Edit size={14} />
                      </button>
                    </PermissionGate>
                    <PermissionGate action="payments.delete">
                      <button className="hb" style={{ color: 'var(--red)' }} onClick={() => handleDelete(payment.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                        <Trash2 size={14} />
                      </button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><DollarSign /></div>
            <div className="empty-state-text">{t.messages.no_data}</div>
          </div>
        )}
      </div>

      {selectedReceipt && (
        <PaymentReceipt 
          payment={selectedReceipt} 
          invoice={invoices.find(i => i.id === selectedReceipt.invoiceId)}
          tenant={tenants.find(t => t.id === selectedReceipt.tenantId)}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Edit Payment Modal */}
      {showEditModal && editingPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowEditModal(false), setEditingPayment(null))}>
          <div className="modal-content-diamond" style={{ maxWidth: '550px' }}>
            <div className="modal-header-diamond">
              <div>
                <h3 className="modal-title-diamond">{lang === 'ar' ? 'تعديل الدفعة' : 'Edit Payment'}</h3>
                <p style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900, marginTop: '4px' }}>
                  {lang === 'ar' ? 'تحديث بيانات الدفعة المالية' : 'Update Financial Transaction'}
                </p>
              </div>
              <button className="modal-close-diamond" onClick={() => { setShowEditModal(false); setEditingPayment(null) }}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: '0 10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="label">{lang === 'ar' ? 'المبلغ (ج.م)' : 'Amount (EGP)'}</label>
                  <input type="number" className="input-field num" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} required />
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'طريقة الدفع' : 'Method'}</label>
                  <select className="input-field" value={editFormData.method} onChange={e => setEditFormData({...editFormData, method: e.target.value})} required>
                    <option value="cash">{lang === 'ar' ? 'نقدي' : 'Cash'}</option>
                    <option value="bank_transfer">{lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="cheque">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label">{lang === 'ar' ? 'المرجع' : 'Reference'}</label>
                <input className="input-field" value={editFormData.reference} onChange={e => setEditFormData({...editFormData, reference: e.target.value})} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label">{lang === 'ar' ? 'البيان / الوصف' : 'Description'}</label>
                <textarea className="input-field" style={{ minHeight: '80px', resize: 'none' }} value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="ftb" style={{ flex: 1, height: '44px' }} onClick={() => { setShowEditModal(false); setEditingPayment(null) }}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn" style={{ flex: 2, height: '44px' }}>
                  {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
