import { useState, useEffect, useCallback } from 'react'
import firestoreService from '../services/firestoreService'
import toast from 'react-hot-toast'
import { 
  FileText, Download, Printer, Search, Plus, Filter, 
  AlertCircle, CheckCircle, Clock, Trash2, Edit, Bell,
  DollarSign, FileCheck, AlertTriangle, TrendingUp, Building
} from 'lucide-react'
import PermissionGate from '../components/PermissionGate'
import { useAuthStore } from '../store/authStore'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../services/translations'
import VoiceInput from '../components/VoiceInput'
import { useNotifications } from '../hooks/useNotifications'

export default function Invoices() {
  const { user, can } = useAuthStore()
  const { currentLanguage } = useLanguage()
  const lang = currentLanguage
  const t = translations[lang]
  const { sendNotification } = useNotifications()

  // State
  const [invoices, setInvoices] = useState([])
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [pendingCounts, setPendingCounts] = useState({ total: 0, violations: 0, maintenance: 0 })
  const [fetchingImports, setFetchingImports] = useState(false)

  const [formData, setFormData] = useState({
    tenant_id: '',
    unit_id: '',
    type: 'rent',
    amount: '',
    tax_amount: '0',
    total_amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending_approval',
    description: ''
  })

  // Effects
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, filterStatus])

  useEffect(() => {
    const amount = parseFloat(formData.amount) || 0
    const taxAmount = Math.round(amount * 0.14 * 100) / 100
    const total = amount + taxAmount
    setFormData(prev => ({ ...prev, tax_amount: taxAmount, total_amount: total }))
  }, [formData.amount])

  // Auto-detect overdue invoices and block units
  const checkAndUpdateOverdueInvoices = useCallback(async (invoicesList, tenantsList) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let hasUpdates = false

    for (const invoice of invoicesList) {
      if (invoice.status === 'pending' && invoice.due_date) {
        const dueDate = new Date(invoice.due_date)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate < today) {
          // Mark invoice as overdue
          try {
            await firestoreService.update('invoices', invoice.id, {
              status: 'overdue',
              updated_at: new Date().toISOString(),
              overdue_detected_at: new Date().toISOString()
            })
            invoice.status = 'overdue'
            hasUpdates = true

            // Find the unit_id for this invoice (from invoice or tenant)
            let unitId = invoice.unit_id
            if (!unitId && invoice.tenant_id) {
              const tenant = tenantsList.find(t => t.id === invoice.tenant_id)
              if (tenant?.unit_id) {
                unitId = tenant.unit_id
                // Also update the invoice with the unit_id for future lookups
                await firestoreService.update('invoices', invoice.id, { unit_id: unitId })
              }
            }

            // Auto-block the associated unit
            if (unitId) {
              try {
                await firestoreService.update('units', unitId, {
                  status: 'blocked',
                  is_forbidden: true,
                  blocked_reason: lang === 'ar' 
                    ? `فاتورة متأخرة: ${invoice.invoice_number}` 
                    : `Overdue Invoice: ${invoice.invoice_number}`,
                  blocked_at: new Date().toISOString(),
                  override_forbidden: false
                })
              } catch (blockErr) {
                console.error('Error blocking unit:', blockErr)
              }
            }

            // Send notification about overdue
            if (invoice.tenant_id) {
              sendNotification({
                user_id: invoice.tenant_id,
                title: lang === 'ar' ? '⚠️ فاتورة متأخرة' : '⚠️ Overdue Invoice',
                message: lang === 'ar'
                  ? `الفاتورة رقم ${invoice.invoice_number} أصبحت متأخرة. يرجى السداد لتجنب حظر الوحدة.`
                  : `Invoice ${invoice.invoice_number} is now overdue. Please pay to avoid unit suspension.`,
                type: 'urgent',
                link: '/invoices'
              })
            }
          } catch (err) {
            console.error('Error updating overdue invoice:', err)
          }
        }
      }
    }

    if (hasUpdates) {
      toast(lang === 'ar' ? 'تم تحديث حالة الفواتير المتأخرة تلقائياً' : 'Overdue invoices auto-updated', { icon: '⏰' })
    }

    return invoicesList
  }, [lang, sendNotification])

  const fetchData = async () => {
    try {
      setLoading(true)
      let filters = []
      if (filterStatus !== 'all') {
        filters.push({ field: 'status', operator: '==', value: filterStatus })
      }

      // Permissions check
      const uRole = user?.role?.toLowerCase();
      if (uRole === 'tenant' || uRole === 'unit_owner' || uRole === 'owner') {
        const fieldName = uRole === 'tenant' ? 'tenant_id' : 'owner_id'
        filters.push({ field: fieldName, operator: '==', value: user.id })
      }

      const [invoicesData, tenantsData, unitsData] = await Promise.all([
        firestoreService.getAll('invoices', filters),
        firestoreService.getAll('tenants'),
        firestoreService.getAll('units')
      ])

      setTenants(tenantsData || [])
      setUnits(unitsData || [])

      // Check and auto-update overdue invoices
      const updatedInvoices = await checkAndUpdateOverdueInvoices(invoicesData || [], tenantsData || [])
      
      let filteredForRole = updatedInvoices;
      if (user?.role?.toLowerCase() === 'tenant') {
        filteredForRole = updatedInvoices.filter(inv => inv.status !== 'pending_approval');
      }
      setInvoices(filteredForRole)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingCounts = async (tenantId) => {
    if (!tenantId) return
    try {
      // Logic for checking pending items for this tenant
      const filters = [
        { field: 'tenant_id', operator: '==', value: tenantId },
        { field: 'status', operator: '==', value: 'pending' }
      ]
      const violations = await firestoreService.getAll('violations', filters)
      setPendingCounts({
        total: violations.length,
        violations: violations.length,
        maintenance: 0
      })
    } catch (error) {
       console.error('Error fetching pending counts:', error)
    }
  }

  const handleTenantChange = (tenantId) => {
    // Auto-fill unit_id from tenant record
    const tenant = tenants.find(t => t.id === tenantId)
    const unitId = tenant?.unit_id || ''
    setFormData(prev => ({ ...prev, tenant_id: tenantId, unit_id: unitId }))
    fetchPendingCounts(tenantId)
  }

  const fetchImportableItems = async (type) => {
    if (!formData.tenant_id) return
    setFetchingImports(true)
    try {
      const filters = [
        { field: 'tenant_id', operator: '==', value: formData.tenant_id },
        { field: 'status', operator: '==', value: 'pending' }
      ]
      const collectionName = type === 'violation' ? 'violations' : 'maintenance'
      const items = await firestoreService.getAll(collectionName, filters)
      
      if (items.length > 0) {
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.fine_amount || item.cost || 0)), 0)
        setFormData(prev => ({
          ...prev,
          amount: (parseFloat(prev.amount) || 0) + totalAmount,
          description: prev.description + (prev.description ? '\n' : '') + `استيراد ${items.length} بند إضافية`
        }))
        toast.success(lang === 'ar' ? `تم استيراد ${items.length} بنود بنجاح` : `Imported ${items.length} items`)
        setPendingCounts(prev => ({ ...prev, total: 0, violations: 0 }))
      } else {
        toast.error(lang === 'ar' ? 'لا توجد بنود للاستيراد' : 'No items to import')
      }
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الاستيراد' : 'Import error')
    } finally {
      setFetchingImports(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.tenant_id) return toast.error(lang === 'ar' ? 'يجب اختيار مستأجر' : 'Select a tenant')
    
    try {
      // Ensure unit_id is set from tenant if not already
      let unitId = formData.unit_id
      if (!unitId && formData.tenant_id) {
        const tenant = tenants.find(t => t.id === formData.tenant_id)
        if (tenant?.unit_id) unitId = tenant.unit_id
      }

      const payload = {
        ...formData,
        unit_id: unitId,
        invoice_number: editingInvoice ? formData.invoice_number : `INV-${Date.now().toString().slice(-8)}`,
        created_at: editingInvoice ? editingInvoice.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (editingInvoice) {
        await firestoreService.update('invoices', editingInvoice.id, payload)
        
        // Auto-generate payment if invoice is marked as paid
        if (editingInvoice.status !== 'paid' && payload.status === 'paid') {
           try {
             await firestoreService.create('payments', {
                tenantId: payload.tenant_id || '',
                invoiceId: editingInvoice.id,
                amount: payload.total_amount || payload.amount,
                method: 'cash', // Default auto method
                reference: payload.invoice_number,
                description: `تسوية وإغلاق تلقائي لفاتورة رقم ${payload.invoice_number}`,
                createdAt: new Date().toISOString(),
                receiptNumber: `REC-${Date.now().toString().slice(-6)}`
             });
           } catch(e) {
             console.error("Failed to auto-create payment", e);
           }
        }
        
        toast.success(lang === 'ar' ? 'تم تحديث الفاتورة' : 'Invoice updated')
      } else {
        await firestoreService.create('invoices', payload)
        toast.success(lang === 'ar' ? 'تم إصدار الفاتورة' : 'Invoice issued')
        
        // Notification
        sendNotification({
          user_id: formData.tenant_id,
          title: lang === 'ar' ? 'فاتورة جديدة' : 'New Invoice',
          message: lang === 'ar' 
            ? `تم إصدار فاتورة جديدة رقم ${payload.invoice_number} بمبلغ ${payload.total_amount} ج.م`
            : `New invoice ${payload.invoice_number} issued for ${payload.total_amount} EGP`,
          type: 'invoice',
          link: '/invoices'
        })
      }
      
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving invoice')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة؟' : 'Delete this invoice?')) return
    try {
      await firestoreService.delete('invoices', id)
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted')
      fetchData()
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed')
    }
  }

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice)
    setFormData({ ...invoice })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      unit_id: '',
      type: 'rent',
      amount: '',
      tax_amount: '0',
      total_amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending_approval',
      description: ''
    })
    setEditingInvoice(null)
    setPendingCounts({ total: 0, violations: 0, maintenance: 0 })
  }

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId)
    return unit ? unit.unit_number : '—'
  }

  const getTenantName = (id) => {
    const tenant = tenants.find(t => t.id === id)
    return tenant ? tenant.name : (lang === 'ar' ? 'غير معروف' : 'Unknown')
  }

  const handleApproveInvoice = async (id) => {
    try {
      await firestoreService.update('invoices', id, { status: 'pending', approved_at: new Date().toISOString() })
      toast.success(lang === 'ar' ? 'تم الاعتماد المالي بنجاح' : 'Invoice financially approved')
      fetchData()
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الاعتماد' : 'Approval failed')
    }
  }

  const handleNotifyTenant = async (invoice) => {
    try {
      await sendNotification({
        user_id: invoice.tenant_id,
        title: lang === 'ar' ? 'تذكير بالسداد' : 'Payment Reminder',
        message: lang === 'ar'
          ? `نذكركم بسداد الفاتورة رقم ${invoice.invoice_number} المستحقة بتاريخ ${new Date(invoice.due_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}`
          : `Reminder to pay invoice ${invoice.invoice_number} due on ${new Date(invoice.due_date).toLocaleDateString()}`,
        type: 'urgent',
        link: '/invoices'
      })
      toast.success(lang === 'ar' ? 'تم إرسال الإخطار' : 'Notification sent')
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل إرسال الإخطار' : 'Failed to send')
    }
  }

  const printInvoice = (invoice) => {
    const win = window.open('', '_blank')
    const tenant = tenants.find(t => t.id === invoice.tenant_id) || {}
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=INV-${invoice.invoice_number}`

    const html = `
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #333; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #d4af37; }
            .inv-info { text-align: ${lang === 'ar' ? 'left' : 'right'}; }
            .inv-title { font-size: 32px; font-weight: 900; margin: 0; color: #111; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .section-title { font-size: 14px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { background: #f9f9f9; padding: 12px; text-align: ${lang === 'ar' ? 'right' : 'left'}; font-size: 13px; font-weight: 800; border-bottom: 2px solid #eee; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-area { display: flex; justify-content: flex-end; }
            .total-box { background: #f9f9f9; padding: 20px; border-radius: 10px; min-width: 250px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .grand-total { font-size: 20px; font-weight: 900; color: #d4af37; border-top: 2px solid #eee; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .qr-code { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">SMART MALL CRM</div>
            <div class="inv-info">
              <h1 class="inv-title">${lang === 'ar' ? 'فاتورة' : 'INVOICE'}</h1>
              <div style="font-weight: 700; margin-top: 5px;">#${invoice.invoice_number}</div>
              <div style="font-size: 13px; color: #666;">${new Date(invoice.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div class="details">
            <div>
              <div class="section-title">${lang === 'ar' ? 'مقدم من' : 'ISSUED BY'}</div>
              <div style="font-weight: 700;">Park St. Mall Management</div>
              <div style="font-size: 13px;">Cairo, Egypt</div>
              <div style="font-size: 13px;">+20 100 000 0000</div>
            </div>
            <div>
              <div class="section-title">${lang === 'ar' ? 'إلى' : 'BILL TO'}</div>
              <div style="font-weight: 700;">${tenant.name || 'N/A'}</div>
              <div style="font-size: 13px;">${tenant.business_name || ''}</div>
              <div style="font-size: 13px;">${tenant.email || ''}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="70%">${lang === 'ar' ? 'الوصف' : 'DESCRIPTION'}</th>
                <th width="30%" style="text-align: ${lang === 'ar' ? 'left' : 'right'}">${lang === 'ar' ? 'المبلغ' : 'AMOUNT'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 700;">${invoice.type === 'rent' ? (lang === 'ar' ? 'إيجار وحدة' : 'Unit Rent') : (invoice.description || 'Service Fee')}</td>
                <td style="text-align: ${lang === 'ar' ? 'left' : 'right'}">${invoice.amount?.toLocaleString()} ج.م</td>
              </tr>
            </tbody>
          </table>

          <div class="total-area">
            <div class="total-box">
              <div class="total-row">
                <span>${lang === 'ar' ? 'المبلغ الفرعي' : 'Subtotal'}</span>
                <span>${invoice.amount?.toLocaleString()} ج.م</span>
              </div>
              <div class="total-row">
                <span>${lang === 'ar' ? 'ضريبة القيمة المضافة (14%)' : 'VAT (14%)'}</span>
                <span>${(invoice.tax_amount || 0).toLocaleString()} ج.م</span>
              </div>
              <div class="total-row grand-total">
                <span>${lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span>${invoice.total_amount?.toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="qr-code">
              <img src="${qrCodeUrl}" width="80" />
              <div style="font-size: 10px; margin-top: 5px;">${lang === 'ar' ? 'مستند معتمد رقمياً' : 'Digitally Verified Document'}</div>
            </div>
            <div style="margin-top: 20px;">${lang === 'ar' ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</div>
          </div>
        </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print(); win.close(); }, 500)
  }

  // Filter logic
  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTenantName(invoice.tenant_id).toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Re-check overdue on each render for display accuracy
  const processedInvoices = invoices.map(inv => {
    if (inv.status === 'pending' && inv.due_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate < today) {
        return { ...inv, status: 'overdue' }
      }
    }
    return inv
  })

  const stats = {
    total: processedInvoices.length,
    paid: processedInvoices.filter(i => i.status === 'paid').length,
    overdue: processedInvoices.filter(i => i.status === 'overdue').length,
    collected: processedInvoices.filter(i => i.status === 'paid').reduce((acc, current) => acc + (parseFloat(current.total_amount) || 0), 0)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <FileText size={24} />
          </div>
          <div>
            <h2>{t.invoices_page.title}</h2>
            <span>{t.invoices_page.subtitle}</span>
          </div>
        </div>
        <PermissionGate action="invoices.create">
          <button className="btn" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus size={16} style={{ marginLeft: lang === 'ar' ? '6px' : '0', marginRight: lang === 'ar' ? '0' : '6px' }} />
            {t.invoices_page.add_invoice}
          </button>
        </PermissionGate>
      </div>

      {/* Stats Overview */}
      <div className="sg">
        <div className="sc bl gc">
          <div className="si2"><FileText /></div>
          <div className="sv num">{stats.total}</div>
          <div className="sl">{t.invoices_page.title}</div>
        </div>
        <div className="sc gn gc">
          <div className="si2"><FileCheck /></div>
          <div className="sv num">{stats.paid}</div>
          <div className="sl">{t.status.paid}</div>
        </div>
        <div className="sc rd gc">
          <div className="si2"><AlertTriangle /></div>
          <div className="sv num">{stats.overdue}</div>
          <div className="sl">{t.status.overdue}</div>
        </div>
        <div className="sc gl gc">
          <div className="si2"><TrendingUp /></div>
          <div className="sv num">{(stats.collected / 1000).toFixed(1)}K</div>
          <div className="sl">{lang === 'ar' ? 'محصل (ج.م)' : 'Collected (EGP)'}</div>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder={t.invoices_page.search_placeholder} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="ft">
          {['all', 'pending_approval', 'pending', 'paid', 'overdue'].map(st => (
            <button 
              key={st} 
              className={`ftb ${filterStatus === st ? 'active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st === 'all' ? t.common.all : (st === 'pending_approval' ? (lang === 'ar' ? 'قيد الاعتماد' : 'Pending Approval') : t.status[st])}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="gc" style={{ overflow: 'hidden' }}>
        <table className="dt">
          <thead>
            <tr>
              <th>{t.invoices_page.invoice_number}</th>
              <th>{t.payments_page.tenant}</th>
              <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
              <th>{t.payments_page.amount}</th>
              <th>{lang === 'ar' ? 'ض.ق.م 14%' : 'VAT 14%'}</th>
              <th>{t.invoices_page.total_amount}</th>
              <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              <th>{t.invoices_page.due_date}</th>
              <th style={{ textAlign: 'center' }}>{t.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => {
              // Check if this specific invoice is overdue on the fly
              const today = new Date(); today.setHours(0,0,0,0)
              const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
              if (dueDate) dueDate.setHours(0,0,0,0)
              const isOverdue = invoice.status === 'overdue' || (invoice.status === 'pending' && dueDate && dueDate < today)
              const displayStatus = isOverdue ? 'overdue' : invoice.status
              
              // Calculate days overdue
              const daysOverdue = isOverdue && dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0

              return (
              <tr key={invoice.id} style={isOverdue ? { background: 'rgba(220,38,38,0.04)' } : {}}>
                <td className="num" style={{ fontWeight: 800 }}>{invoice.invoice_number}</td>
                <td style={{ fontWeight: 600 }}>{getTenantName(invoice.tenant_id)}</td>
                <td>
                  <span style={{ fontSize: '11px', color: 'var(--txt2)' }}>
                    {invoice.type === 'rent' ? (lang === 'ar' ? 'إيجار' : 'Rent') : 
                     invoice.type === 'maintenance' ? (lang === 'ar' ? 'صيانة' : 'Maint.') : 
                     (lang === 'ar' ? 'أخرى' : 'Other')}
                  </span>
                </td>
                <td className="num">{invoice.amount?.toLocaleString()}</td>
                <td className="num" style={{ color: 'var(--or)', fontSize: '12px' }}>{(invoice.tax_amount || 0)?.toLocaleString()}</td>
                <td className="num" style={{ color: 'var(--gold)', fontWeight: 800 }}>{invoice.total_amount?.toLocaleString()}</td>
                <td>
                  <span className={`bs ${displayStatus === 'pending_approval' ? 'processing' : displayStatus}`}>
                    {displayStatus === 'pending_approval' ? (lang === 'ar' ? 'قيد الاعتماد' : 'Pending Approval') : (t.status[displayStatus] || displayStatus)}
                  </span>
                  {isOverdue && daysOverdue > 0 && (
                    <div style={{ fontSize: '9px', color: 'var(--rd)', fontWeight: 800, marginTop: '2px' }}>
                      {lang === 'ar' ? `متأخر ${daysOverdue} يوم` : `${daysOverdue} days late`}
                    </div>
                  )}
                </td>
                <td className="num" style={{ fontSize: '11px', color: isOverdue ? 'var(--rd)' : 'inherit', fontWeight: isOverdue ? 800 : 400 }}>
                  {new Date(invoice.due_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    {displayStatus === 'pending_approval' && can('invoices.edit') && (
                      <button className="hb" title={lang === 'ar' ? 'اعتماد مالي' : 'Approve'} style={{ color: 'var(--green)' }} onClick={() => handleApproveInvoice(invoice.id)}><CheckCircle size={14} /></button>
                    )}
                    <button className="hb" title={t.print} onClick={() => printInvoice(invoice)}><Printer size={14} /></button>
                    {(displayStatus === 'pending' || displayStatus === 'overdue') && (
                      <button className="hb" title={lang === 'ar' ? 'إخطار' : 'Notify'} style={{ color: isOverdue ? 'var(--rd)' : 'var(--or)' }} onClick={() => handleNotifyTenant(invoice)}><Bell size={14} /></button>
                    )}
                    <PermissionGate action="invoices.edit" resource={invoice}>
                      <button className="hb" style={{ color: 'var(--bl)' }} onClick={() => handleEdit(invoice)}><Edit size={14} /></button>
                    </PermissionGate>
                    <PermissionGate action="invoices.delete" resource={invoice}>
                      <button className="hb" style={{ color: 'var(--rd)' }} onClick={() => handleDelete(invoice.id)}><Trash2 size={14} /></button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && (
           <div className="empty-state">
             <div className="empty-state-icon"><AlertCircle /></div>
             <div className="empty-state-text">{t.messages.no_data}</div>
           </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content-diamond" style={{ maxWidth: '650px' }}>
            <div className="modal-header-diamond">
              <div>
                <h3 className="modal-title-diamond">{editingInvoice ? (lang === 'ar' ? 'تعديل فاتورة' : 'Edit Invoice') : t.invoices_page.add_invoice}</h3>
                <p style={{ fontSize: '10px', color: 'var(--txt3)', letterSpacing: '1px', marginTop: '2px', textTransform: 'uppercase' }}>Financial Protocol</p>
              </div>
              <button className="modal-close-diamond" onClick={() => setShowModal(false)}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="col-span-1">
                  <label className="label">{t.payments_page.tenant}</label>
                  <select 
                    className="input-field" 
                    value={formData.tenant_id} 
                    onChange={e => handleTenantChange(e.target.value)}
                    required
                  >
                    <option value="">{t.payments_page.select_tenant}</option>
                    {tenants.map(tn => (
                      <option key={tn.id} value={tn.id}>{tn.name} - {tn.business_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                  <select 
                    className="input-field" 
                    value={formData.unit_id} 
                    onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                  >
                    <option value="">{lang === 'ar' ? 'اختر الوحدة' : 'Select Unit'}</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.unit_number} - {u.floor}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'نوع الفاتورة' : 'Invoice Type'}</label>
                  <select 
                    className="input-field" 
                    value={formData.type} 
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="rent">{lang === 'ar' ? 'إيجار' : 'Rent'}</option>
                    <option value="maintenance">{lang === 'ar' ? 'صيانة' : 'Maintenance'}</option>
                    <option value="violation">{lang === 'ar' ? 'مخالفة' : 'Violation'}</option>
                    <option value="other">{t.invoices_page.other}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'المبلغ الصافي' : 'Net Amount'}</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                    required 
                  />
                </div>

                <div>
                  <label className="label">{t.invoices_page.due_date}</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={formData.due_date} 
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'الحالة' : 'Status'}</label>
                  <select 
                    className="input-field" 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending_approval">{lang === 'ar' ? 'قيد الاعتماد المالي' : 'Pending Approval'}</option>
                    <option value="pending">{t.status.pending}</option>
                    <option value="paid">{t.status.paid}</option>
                    <option value="overdue">{t.status.overdue}</option>
                  </select>
                </div>
              </div>

              {pendingCounts.total > 0 && (
                <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--gold)' }} />
                    <span style={{ fontWeight: 600 }}>{lang === 'ar' ? `يوجد ${pendingCounts.total} مخالفات غير مفوترة لهذا المستأجر` : `Found ${pendingCounts.total} unbilled violations`}</span>
                  </div>
                  <button type="button" className="btn" style={{ padding: '4px 12px', height: 'auto', background: 'var(--gold)' }} onClick={() => fetchImportableItems('violation')}>
                    {fetchingImports ? '...' : (lang === 'ar' ? 'استيراد' : 'Import')}
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label className="label">{lang === 'ar' ? 'ملاحظات وتفاصيل' : 'Notes & Details'}</label>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="input-field" 
                    style={{ minHeight: '80px', resize: 'none' }} 
                    placeholder={lang === 'ar' ? 'اكتب تفاصيل إضافية هنا...' : 'Enter any additional details...'}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div style={{ position: 'absolute', left: '10px', bottom: '10px' }}>
                    <VoiceInput onTranscript={txt => setFormData(p => ({ ...p, description: p.description + ' ' + txt }))} size="sm" />
                  </div>
                </div>
              </div>

              {/* Summary Area */}
              <div style={{ background: 'var(--bg2)', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid var(--bdr)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--txt3)' }}>{lang === 'ar' ? 'المبلغ الصافي' : 'Net Amount'}</span>
                  <span className="num" style={{ fontSize: '14px', color: 'var(--txt2)' }}>{(parseFloat(formData.amount) || 0).toLocaleString()} ج.م</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--txt3)' }}>{lang === 'ar' ? 'ضريبة القيمة المضافة (14%)' : 'VAT (14%)'}</span>
                  <span className="num" style={{ fontSize: '14px', color: 'var(--txt2)' }}>{(parseFloat(formData.tax_amount) || 0).toLocaleString()} ج.م</span>
                </div>
                <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt3)', textTransform: 'uppercase' }}>{lang === 'ar' ? 'المستحق الإجمالي' : 'TOTAL DUE'}</span>
                  <div className="num" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--gold)' }}>
                    {formData.total_amount?.toLocaleString()} <span style={{ fontSize: '12px' }}>ج.م</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="ftb" style={{ flex: 1, height: '44px' }} onClick={() => setShowModal(false)}>{t.cancel}</button>
                <button type="submit" className="btn" style={{ flex: 2, height: '44px' }}>
                  {editingInvoice ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes') : (lang === 'ar' ? 'إصدار الفاتورة' : 'Issue Invoice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
