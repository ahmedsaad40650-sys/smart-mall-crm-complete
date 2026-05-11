import { useEffect, useState, useMemo } from 'react'
import firestoreService from '../services/firestoreService'
import storageService from '../services/storageService'
import toast from 'react-hot-toast'
import {
  Wrench, Clock, FileText, CheckCircle, Plus, Search, Filter, Edit, 
  Trash2, ChevronDown, ChevronUp, MessageSquare, DollarSign, Building, 
  Calendar, Paperclip, Image, Video, Download, Eye, XCircle, Send, 
  ThumbsUp, ThumbsDown, Receipt, Settings, Zap, Droplets, Wind, 
  Sparkles, X, Clipboard, Activity, Target, Shield, AlertTriangle, Hammer
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import VoiceInput from '../components/VoiceInput'
import ChatBox from '../components/ChatBox'
import { useAuthStore } from '../store/authStore'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../services/translations'
import { TelemetryService } from '../utils/errorUtility'
import PermissionGate from '../components/PermissionGate'
import { useNotifications } from '../hooks/useNotifications'
import { usePermissions } from '../hooks/usePermissions'

export default function Maintenance() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentLanguage } = useLanguage()
  const lang = currentLanguage
  const t = translations[lang]
  const { can } = usePermissions()
  const { sendNotification, notifyRoles } = useNotifications()
  
  const [requests, setRequests] = useState([])
  const [units, setUnits] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [showCostModal, setShowCostModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRequest, setExpandedRequest] = useState(null)
  const [attachments, setAttachments] = useState({})
  const [uploadedFiles, setUploadedFiles] = useState([])

  const [formData, setFormData] = useState({
    unit_id: '',
    tenant_id: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
  })

  const tempRequestId = useMemo(() => {
    return editingRequest?.id || `temp-${Date.now()}`
  }, [editingRequest, showModal])

  const [costData, setCostData] = useState({
    estimated_cost: '',
    cost_notes: '',
    cost_breakdown: {
      labor: '',
      materials: '',
      other: ''
    }
  })

  const statusFlow = {
    pending: { label: t.status.pending, color: 'pending', icon: Clock, next: 'cost_submitted' },
    cost_submitted: { label: lang === 'ar' ? 'بانتظار الموافقة' : 'Awaiting Approval', color: 'warn', icon: DollarSign, next: 'approved' },
    cost_rejected: { label: lang === 'ar' ? 'مرفوضة' : 'Rejected', color: 'cancelled', icon: XCircle, next: null },
    approved: { label: lang === 'ar' ? 'معتمدة' : 'Approved', color: 'active', icon: ThumbsUp, next: 'in_progress' },
    in_progress: { label: lang === 'ar' ? 'قيد التنفيذ' : 'In Progress', color: 'processing', icon: Wrench, next: 'completed' },
    completed: { label: t.status.completed, color: 'active', icon: CheckCircle, next: null }
  }

  const categories = [
    { id: 'general', label: t.maintenance_page.general, icon: Settings },
    { id: 'electrical', label: t.maintenance_page.electrical, icon: Zap },
    { id: 'plumbing', label: t.maintenance_page.plumbing, icon: Droplets },
    { id: 'hvac', label: t.maintenance_page.ac, icon: Wind },
    { id: 'cleaning', label: lang === 'ar' ? 'نظافة' : 'Cleaning', icon: Sparkles }
  ]

  useEffect(() => {
    if (user) {
      fetchRequests()
      fetchUnits()
      fetchTenants()
    }
  }, [filterStatus, user])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      let filters = []
      if (filterStatus !== 'all') filters.push({ field: 'status', operator: '==', value: filterStatus })
      if (user?.role?.toLowerCase() === 'tenant' || user?.role?.toLowerCase() === 'unit_owner' || user?.role?.toLowerCase() === 'owner') {
        filters.push({ field: 'tenant_id', operator: '==', value: user.id })
      }
      const data = await firestoreService.getAll('maintenance_requests', filters)
      setRequests(data?.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) || [])
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل تحميل طلبات الصيانة' : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      let filters = []
      if (user?.role?.toLowerCase() === 'tenant' || user?.role?.toLowerCase() === 'unit_owner' || user?.role?.toLowerCase() === 'owner') {
        filters.push({ field: 'id', operator: '==', value: user.unit_id || 'none' })
      }
      const data = await firestoreService.getAll('units', filters)
      setUnits(data || [])
    } catch (error) { console.error('Units fetch error:', error) }
  }

  const fetchTenants = async () => {
    try {
      let filters = []
      if (user?.role?.toLowerCase() === 'tenant' || user?.role?.toLowerCase() === 'unit_owner' || user?.role?.toLowerCase() === 'owner') {
        filters.push({ field: 'id', operator: '==', value: user.id })
      }
      const data = await firestoreService.getAll('tenants', filters)
      setTenants(data || [])
    } catch (error) { console.error('Tenants fetch error:', error) }
  }

  const fetchAttachments = async (requestId) => {
    try {
      const files = await storageService.listFolder(`maintenance/${requestId}`)
      setAttachments(prev => ({ ...prev, [requestId]: files || [] }))
    } catch (error) { console.error('Attachments fetch error:', error) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let requestId = editingRequest?.id
      const payload = { ...formData, updated_at: new Date().toISOString() }
      
      if (editingRequest) {
        await firestoreService.update('maintenance_requests', requestId, payload)
        toast.success(lang === 'ar' ? 'تم التعديل بنجاح' : 'Updated successfully')
      } else {
        const fullPayload = { ...payload, status: 'pending', created_at: new Date().toISOString() }
        if (user?.unit_id) fullPayload.unit_id = user.unit_id
        if (user?.id) fullPayload.tenant_id = user.id
        requestId = await firestoreService.create('maintenance_requests', fullPayload)
        toast.success(lang === 'ar' ? 'تم إضافة الطلب بنجاح' : 'Success')
      }

      setShowModal(false)
      resetForm()
      fetchRequests()
    } catch (error) { toast.error(lang === 'ar' ? 'خطأ في الحفظ' : 'Save error') }
  }

  const handleEdit = (request) => {
    setEditingRequest(request)
    setFormData({
      unit_id: request.unit_id,
      tenant_id: request.tenant_id || '',
      title: request.title,
      description: request.description || '',
      category: request.category || 'general',
      priority: request.priority || 'medium',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Delete?')) return
    try {
      await firestoreService.delete('maintenance_requests', id)
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted')
      fetchRequests()
    } catch (error) { toast.error('Delete failed') }
  }

  const updateStatus = async (id, status) => {
    try {
      await firestoreService.update('maintenance_requests', id, { status })
      toast.success(lang === 'ar' ? 'تم تحديث الحالة' : 'Status updated')
      fetchRequests()
    } catch (error) { toast.error('Error') }
  }

  const resetForm = () => {
    setEditingRequest(null)
    setFormData({
      unit_id: user?.unit_id || '',
      tenant_id: user?.id || '',
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
    })
    setUploadedFiles([])
  }

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId)
    return unit ? unit.unit_number : '—'
  }

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    return tenant ? tenant.name : (lang === 'ar' ? 'غير معروف' : 'Unknown')
  }

  const filteredRequests = requests.filter(req => {
    const search = searchTerm.toLowerCase()
    return req.title?.toLowerCase().includes(search) || req.description?.toLowerCase().includes(search)
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    active: requests.filter(r => r.status === 'in_progress' || r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <Wrench size={24} />
          </div>
          <div>
            <h2>{t.maintenance_page.title}</h2>
            <span>{t.maintenance_page.subtitle}</span>
          </div>
        </div>
        <PermissionGate action="maintenance.create">
          <button className="btn" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
            {lang === 'ar' ? 'طلب صيانة جديد' : 'New Request'}
          </button>
        </PermissionGate>
      </div>

      {/* Stats Overview */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="sc bl gc">
          <div className="si2"><Activity /></div>
          <div className="sv num">{stats.total}</div>
          <div className="sl">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</div>
        </div>
        <div className="sc or gc">
          <div className="si2"><Clock /></div>
          <div className="sv num">{stats.pending}</div>
          <div className="sl">{t.status.pending}</div>
        </div>
        <div className="sc pr gc">
          <div className="si2"><Hammer /></div>
          <div className="sv num">{stats.active}</div>
          <div className="sl">{lang === 'ar' ? 'قيد العمل' : 'Work in Progress'}</div>
        </div>
        <div className="sc gn gc">
          <div className="si2"><CheckCircle /></div>
          <div className="sv num">{stats.completed}</div>
          <div className="sl">{t.status.completed}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder={lang === 'ar' ? 'بحث في طلبات الصيانة...' : 'Search maintenance...'} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="ft">
          {['all', 'pending', 'in_progress', 'completed'].map(s => (
            <button 
              key={s} 
              className={`ftb ${filterStatus === s ? 'active' : ''}`} 
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? t.common.all : (statusFlow[s]?.label || t.status[s])}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="gc" style={{ overflow: 'hidden' }}>
        <table className="dt">
          <thead>
            <tr>
              <th>{t.maintenance_page.title}</th>
              <th>{lang === 'ar' ? 'الوحدة' : 'Unit'}</th>
              <th>{t.maintenance_page.priority}</th>
              <th>{t.maintenance_page.category}</th>
              <th>{t.fields.status}</th>
              <th>{t.fields.date}</th>
              <th style={{ textAlign: 'center' }}>{t.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(req => {
              const status = statusFlow[req.status] || statusFlow.pending
              const Icon = status.icon
              return (
                <tr key={req.id}>
                  <td style={{ fontWeight: 800 }}>
                    <div>{req.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--txt3)', fontWeight: 500 }}>{req.description?.slice(0, 40)}...</div>
                  </td>
                  <td className="num">{getUnitNumber(req.unit_id)}</td>
                  <td>
                    <span className={`bs ${req.priority === 'high' ? 'cancelled' : req.priority === 'medium' ? 'warn' : 'active'}`} style={{ fontSize: '10px' }}>
                      {{ high: t.maintenance_page.high, medium: t.maintenance_page.medium, low: t.maintenance_page.low }[req.priority]}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>{categories.find(c => c.id === req.category)?.label || req.category}</td>
                  <td>
                    <span className={`bs ${status.color}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                       <Icon size={12} />
                       {status.label}
                    </span>
                  </td>
                  <td className="num" style={{ fontSize: '11px' }}>{new Date(req.created_at || req.reported_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                      <button className="hb" onClick={() => { setSelectedRequest(req); setShowDetailsModal(true); fetchAttachments(req.id) }}>
                        <Eye size={14} />
                      </button>
                      <PermissionGate action="maintenance.edit" resource={req}>
                        <button className="hb" style={{ color: 'var(--blue)' }} onClick={() => handleEdit(req)}><Edit size={14} /></button>
                      </PermissionGate>
                      <PermissionGate action="maintenance.delete" resource={req}>
                        <button className="hb" style={{ color: 'var(--red)' }} onClick={() => handleDelete(req.id)}><Trash2 size={14} /></button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredRequests.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Wrench /></div>
            <div className="empty-state-text">{t.messages.no_data}</div>
          </div>
        )}
      </div>

      {/* ═══ Enhanced Create/Edit Modal ═══ */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowModal(false), resetForm())}>
          <div className="modal-content-diamond" style={{ maxWidth: '820px', padding: '0' }}>
            {/* Modal Header with gradient accent */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--bdr)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--gold), #f0c040)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}>
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--txt)' }}>{editingRequest ? (lang === 'ar' ? 'تعديل طلب الصيانة' : 'Edit Request') : (lang === 'ar' ? 'طلب صيانة جديد' : 'New Request')}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>{lang === 'ar' ? 'بروتوكول الصيانة' : 'Maintenance Protocol'}</p>
                  </div>
                </div>
                <button className="modal-close-diamond" onClick={() => { setShowModal(false); resetForm() }}><X size={20} /></button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
              {/* Section 1: Category Selection Cards */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={12} /> {t.maintenance_page.category}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {categories.map(c => {
                    const CatIcon = c.icon
                    const isActive = formData.category === c.id
                    return (
                      <button type="button" key={c.id} onClick={() => setFormData({ ...formData, category: c.id })}
                        style={{ padding: '14px 8px', borderRadius: '14px', border: isActive ? '2px solid var(--gold)' : '1px solid var(--bdr)', background: isActive ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: isActive ? 'var(--gold)' : 'var(--txt2)' }}>
                        <CatIcon size={20} />
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Section 2: Priority Badges */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={12} /> {t.maintenance_page.priority}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'low', label: t.maintenance_page.low, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: Shield },
                    { id: 'medium', label: t.maintenance_page.medium, color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: AlertTriangle },
                    { id: 'high', label: t.maintenance_page.high, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: Zap }
                  ].map(p => {
                    const PIcon = p.icon
                    const isActive = formData.priority === p.id
                    return (
                      <button type="button" key={p.id} onClick={() => setFormData({ ...formData, priority: p.id })}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: isActive ? `2px solid ${p.color}` : '1px solid var(--bdr)', background: isActive ? p.bg : 'transparent', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: isActive ? p.color : 'var(--txt3)', fontWeight: 700, fontSize: '12px', fontFamily: 'Tajawal' }}>
                        <PIcon size={16} />
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Section 3: Core Details */}
              <div style={{ marginBottom: '28px', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)' }}>
                <label className="label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={12} /> {lang === 'ar' ? 'تفاصيل الطلب' : 'Request Details'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}><Building size={10} style={{ display: 'inline', marginLeft: '4px' }} /> {lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                    <select className="input-field" value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value })} required disabled={user?.role?.toLowerCase() === 'tenant'}>
                      <option value="">{lang === 'ar' ? 'اختر الوحدة' : 'Select Unit'}</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.floor}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}><Clipboard size={10} style={{ display: 'inline', marginLeft: '4px' }} /> {t.fields.title || (lang === 'ar' ? 'العنوان' : 'Title')}</label>
                    <input className="input-field" placeholder={lang === 'ar' ? 'مثال: تسريب مياه في الحمام' : 'e.g. Water leak in bathroom'} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label" style={{ fontSize: '9px', opacity: 0.7, marginBottom: '6px' }}><MessageSquare size={10} style={{ display: 'inline', marginLeft: '4px' }} /> {t.fields.description || (lang === 'ar' ? 'الوصف' : 'Description')}</label>
                  <div style={{ position: 'relative' }}>
                    <textarea className="input-field" style={{ minHeight: '110px', resize: 'none', paddingBottom: '40px' }} placeholder={lang === 'ar' ? 'اشرح المشكلة بالتفصيل...' : 'Describe the issue in detail...'} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                    <div style={{ position: 'absolute', left: '10px', bottom: '10px' }}>
                      <VoiceInput onTranscript={text => setFormData(p => ({ ...p, description: p.description + ' ' + text }))} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: File Upload */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Paperclip size={12} /> {lang === 'ar' ? 'المرفقات' : 'Attachments'}</label>
                <FileUpload
                  referenceType="maintenance"
                  referenceId={tempRequestId}
                  onFilesUploaded={(files) => setUploadedFiles(prev => [...prev, ...files])}
                  maxFiles={5}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="ftb" style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '13px' }} onClick={() => { setShowModal(false); resetForm() }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="btn" style={{ flex: 2, height: '48px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Send size={16} />
                  {editingRequest ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إرسال الطلب' : 'Submit Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Enhanced Details Modal ═══ */}
      {showDetailsModal && selectedRequest && (() => {
        const currentStatus = statusFlow[selectedRequest.status] || statusFlow.pending
        const CurrentIcon = currentStatus.icon
        const statusSteps = ['pending', 'approved', 'in_progress', 'completed']
        const currentStepIdx = statusSteps.indexOf(selectedRequest.status)
        const priorityConfig = { high: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: t.maintenance_page.high }, medium: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: t.maintenance_page.medium }, low: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: t.maintenance_page.low } }
        const pCfg = priorityConfig[selectedRequest.priority] || priorityConfig.medium
        return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetailsModal(false)}>
          <div className="modal-content-diamond" style={{ maxWidth: '720px', padding: '0' }}>
            {/* Header with status accent bar */}
            <div style={{ borderBottom: '1px solid var(--bdr)' }}>
              <div style={{ height: '4px', background: `linear-gradient(90deg, ${pCfg.color}, var(--gold))`, borderRadius: '28px 28px 0 0' }} />
              <div style={{ padding: '24px 32px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: pCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pCfg.color, flexShrink: 0 }}>
                    <CurrentIcon size={22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRequest.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`bs ${currentStatus.color}`} style={{ fontSize: '10px' }}>{currentStatus.label}</span>
                      <span style={{ fontSize: '10px', color: pCfg.color, fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: pCfg.bg }}>{pCfg.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--txt3)' }}>#{selectedRequest.id?.slice(-6)}</span>
                    </div>
                  </div>
                </div>
                <button className="modal-close-diamond" onClick={() => setShowDetailsModal(false)}><X size={20} /></button>
              </div>
            </div>

            <div style={{ padding: '28px 32px 32px' }}>
              {/* Status Timeline */}
              <div style={{ marginBottom: '28px', padding: '20px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)' }}>
                <label className="label" style={{ marginBottom: '16px' }}>{lang === 'ar' ? 'مسار الطلب' : 'Request Timeline'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0', position: 'relative' }}>
                  {statusSteps.map((step, idx) => {
                    const stepInfo = statusFlow[step]
                    const StepIcon = stepInfo?.icon || Clock
                    const isDone = idx <= currentStepIdx
                    const isCurrent = idx === currentStepIdx
                    return (
                      <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {idx > 0 && <div style={{ position: 'absolute', top: '16px', right: '50%', width: '100%', height: '3px', background: isDone ? 'var(--gold)' : 'var(--bdr)', zIndex: 0 }} />}
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isCurrent ? 'linear-gradient(135deg, var(--gold), #f0c040)' : isDone ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: isDone ? '2px solid var(--gold)' : '1px solid var(--bdr)', color: isCurrent ? '#000' : isDone ? 'var(--gold)' : 'var(--txt3)', zIndex: 1, transition: 'all 0.3s', boxShadow: isCurrent ? '0 4px 12px rgba(212,175,55,0.3)' : 'none' }}>
                          <StepIcon size={14} />
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: isDone ? 'var(--gold)' : 'var(--txt3)', marginTop: '6px', textAlign: 'center' }}>{stepInfo?.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {[
                  { icon: Building, label: lang === 'ar' ? 'الوحدة' : 'Unit', value: getUnitNumber(selectedRequest.unit_id) },
                  { icon: MessageSquare, label: lang === 'ar' ? 'المستأجر' : 'Tenant', value: getTenantName(selectedRequest.tenant_id) },
                  { icon: Settings, label: t.maintenance_page.category, value: categories.find(c => c.id === selectedRequest.category)?.label || selectedRequest.category },
                  { icon: Calendar, label: t.fields.date || (lang === 'ar' ? 'التاريخ' : 'Date'), value: new Date(selectedRequest.created_at || selectedRequest.reported_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') }
                ].map((item, i) => {
                  const InfoIcon = item.icon
                  return (
                    <div key={i} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)', textAlign: 'center' }}>
                      <InfoIcon size={16} style={{ color: 'var(--gold)', marginBottom: '6px' }} />
                      <div style={{ fontSize: '9px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--txt)' }}>{item.value}</div>
                    </div>
                  )
                })}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '14px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <label className="label" style={{ opacity: 0.6, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={12} /> {t.fields.description || (lang === 'ar' ? 'الوصف' : 'Description')}</label>
                <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--txt)', margin: 0 }}>{selectedRequest.description}</p>
              </div>

              {/* Attachments */}
              {attachments[selectedRequest.id]?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label className="label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Paperclip size={12} /> {lang === 'ar' ? 'المرفقات' : 'Attachments'} ({attachments[selectedRequest.id].length})</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {attachments[selectedRequest.id].map(file => (
                      <button key={file.id} onClick={() => window.open(file.url, '_blank')}
                        style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'Tajawal' }}>
                        <Paperclip size={14} />
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{file.original_name || file.name}</span>
                        <Download size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {can('maintenance.approve') && (selectedRequest.status === 'pending' || selectedRequest.status === 'approved') && (
                  <button className="btn" style={{ flex: 2, height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px' }} onClick={() => {
                    if (selectedRequest.status === 'pending') updateStatus(selectedRequest.id, 'approved');
                    setShowDetailsModal(false);
                    navigate('/work-orders', { state: { fromMaintenance: true, request: selectedRequest } });
                  }}>
                    <Hammer size={16} />
                    {lang === 'ar' ? 'تحويل لأمر عمل' : 'Convert to Work Order'}
                  </button>
                )}
                {can('maintenance.approve') && selectedRequest.status === 'in_progress' && (
                  <button className="btn" style={{ flex: 2, height: '48px', borderRadius: '12px', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px' }} onClick={() => { updateStatus(selectedRequest.id, 'completed'); setShowDetailsModal(false) }}>
                    <CheckCircle size={16} />
                    {lang === 'ar' ? 'إكمال الطلب' : 'Complete'}
                  </button>
                )}
                <button className="ftb" style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '12px' }} onClick={() => setShowDetailsModal(false)}>{lang === 'ar' ? 'إغلاق' : 'Close'}</button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
