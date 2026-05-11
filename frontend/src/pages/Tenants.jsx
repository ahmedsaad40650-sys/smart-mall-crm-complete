import { useEffect, useState } from 'react'
import firestoreService from '../services/firestoreService'
import toast from 'react-hot-toast'
import VoiceInput from '../components/VoiceInput'
import { useAuthStore } from '../store/authStore'
import PermissionGate from '../components/PermissionGate'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../services/translations'
import { 
  Users, UserPlus, Search, Filter, Edit, Trash2, 
  Store, Mail, Phone, MapPin, Building, Briefcase,
  AlertCircle, ChevronLeft, MoreVertical, X, Check
} from 'lucide-react'

export default function Tenants() {
  const { user } = useAuthStore()
  const { currentLanguage } = useLanguage()
  const lang = currentLanguage
  const t = translations[lang]
  
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', business_name: '', business_type: '',
    tax_id: '', address: '', unit_id: '', status: 'active', notes: ''
  })

  useEffect(() => { 
    if (user) { 
      fetchTenants()
      fetchUnits() 
    } 
  }, [user])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      let filters = []
      if (user?.role?.toLowerCase() === 'tenant' || user?.role?.toLowerCase() === 'unit_owner' || user?.role?.toLowerCase() === 'owner') {
        filters.push({ field: 'id', operator: '==', value: user.id || 'no_id' })
      }
      const data = await firestoreService.getAll('tenants', filters)
      setTenants(data || [])
    } catch (error) { 
      toast.error(lang === 'ar' ? 'فشل تحميل بيانات المستأجرين' : 'Failed to load tenants') 
    } finally { 
      setLoading(false) 
    }
  }

  const fetchUnits = async () => {
    try {
      const data = await firestoreService.getAll('units', [])
      setUnits(data || [])
    } catch (error) { 
      console.error('Error fetching units:', error) 
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTenant) {
        await firestoreService.update('tenants', editingTenant.id, formData)
        toast.success(lang === 'ar' ? 'تم تحديث البيانات بنجاح' : 'Updated successfully')
      } else {
        await firestoreService.create('tenants', formData)
        toast.success(lang === 'ar' ? 'تم إضافة المستأجر بنجاح' : 'Tenant added successfully')
      }
      setShowModal(false)
      resetForm()
      fetchTenants()
    } catch (error) { 
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving data') 
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
      unit_id: tenant.unit_id || '', 
      status: tenant.status, 
      notes: tenant.notes || '' 
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المستأجر؟' : 'Delete this tenant?')) return
    try { 
      await firestoreService.delete('tenants', id)
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted')
      fetchTenants() 
    } catch (error) { 
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed') 
    }
  }

  const resetForm = () => {
    setFormData({ 
      name: '', email: '', phone: '', business_name: '', business_type: '',
      tax_id: '', address: '', unit_id: '', status: 'active', notes: '' 
    })
    setEditingTenant(null)
  }

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId)
    return unit ? unit.unit_number : '—'
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = (tenant.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    inactive: tenants.filter(t => t.status === 'inactive').length
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <Users size={24} />
          </div>
          <div>
            <h2>{t.tenants_page.title}</h2>
            <span>{t.tenants_page.subtitle}</span>
          </div>
        </div>
        <PermissionGate action="tenants.create">
          <button className="btn" onClick={() => { resetForm(); setShowModal(true) }}>
            <UserPlus size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
            {t.tenants_page.add_tenant}
          </button>
        </PermissionGate>
      </div>

      {/* Stats Overview */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="sc bl gc">
          <div className="si2"><Users /></div>
          <div className="sv num">{stats.total}</div>
          <div className="sl">{t.tenants_page.total_tenants}</div>
        </div>
        <div className="sc gn gc">
          <div className="si2"><Check /></div>
          <div className="sv num">{stats.active}</div>
          <div className="sl">{t.status.active}</div>
        </div>
        <div className="sc rd gc">
          <div className="si2"><X /></div>
          <div className="sv num">{stats.inactive}</div>
          <div className="sl">{t.status.inactive}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder={t.tenants_page.search_placeholder} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="ft">
          {['all', 'active', 'inactive'].map(s => (
            <button 
              key={s} 
              className={`ftb ${filterStatus === s ? 'active' : ''}`} 
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? t.common.all : t.status[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredTenants.map(tenant => (
          <div key={tenant.id} className="gc fu" style={{ padding: '20px', borderRadius: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div className="gg" style={{ 
                width: '48px', height: '48px', borderRadius: '14px', 
                background: 'linear-gradient(135deg, var(--gold), #f0c040)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '22px', flexShrink: 0, color: '#000'
              }}>
                <Store size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '15px', color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tenant.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--txt3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={10} /> {tenant.business_name}
                </div>
              </div>
              <span className={`bs ${tenant.status === 'active' ? 'active' : 'cancelled'}`}>
                {t.status[tenant.status] || tenant.status}
              </span>
            </div>

            <div style={{ 
              fontSize: '12px', color: 'var(--txt2)', display: 'flex', 
              flexDirection: 'column', gap: '8px', marginBottom: '20px',
              padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} style={{ color: 'var(--gold)' }} /> {tenant.email || '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} style={{ color: 'var(--gold)' }} /> <span className="num">{tenant.phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} style={{ color: 'var(--gold)' }} /> 
                <span style={{ fontWeight: 800 }}>{t.tenants_page.unit}: <span className="num" style={{ color: 'var(--gold)' }}>{getUnitNumber(tenant.unit_id)}</span></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <PermissionGate action="tenants.edit" resource={tenant}>
                <button className="btn" style={{ flex: 1, height: '36px', fontSize: '11px' }} onClick={() => handleEdit(tenant)}>
                  <Edit size={12} style={{ marginLeft: lang === 'ar' ? '4px' : '0', marginRight: lang === 'ar' ? '0' : '4px' }} />
                  {t.common.edit}
                </button>
              </PermissionGate>
              <PermissionGate action="tenants.delete" resource={tenant}>
                <button 
                  className="ftb" 
                  style={{ flex: 1, height: '36px', fontSize: '11px', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }} 
                  onClick={() => handleDelete(tenant.id)}
                >
                  <Trash2 size={12} style={{ marginLeft: lang === 'ar' ? '4px' : '0', marginRight: lang === 'ar' ? '0' : '4px' }} />
                  {t.common.delete}
                </button>
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Users /></div>
          <div className="empty-state-text">{t.messages.no_data}</div>
        </div>
      )}

      {/* ═══ Enhanced Tenants Modal ═══ */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowModal(false), resetForm())}>
          <div className="modal-content-diamond" style={{ maxWidth: '800px', padding: '0' }}>
            {/* Header */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--bdr)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--gold), #f0c040)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--txt)' }}>{editingTenant ? (lang === 'ar' ? 'تعديل بيانات المستأجر' : 'Edit Tenant') : t.tenants_page.add_tenant}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>{lang === 'ar' ? 'بروتوكول التسجيل' : 'Registry Protocol'}</p>
                  </div>
                </div>
                <button className="modal-close-diamond" onClick={() => { setShowModal(false); resetForm() }}><X size={20} /></button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
              {/* Status Toggle */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={12} /> {lang === 'ar' ? 'حالة المستأجر' : 'Tenant Status'}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'active', label: t.status.active, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { id: 'inactive', label: t.status.inactive, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
                  ].map(s => (
                    <button type="button" key={s.id} onClick={() => setFormData({ ...formData, status: s.id })}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: formData.status === s.id ? `2px solid ${s.color}` : '1px solid var(--bdr)', background: formData.status === s.id ? s.bg : 'transparent', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: formData.status === s.id ? s.color : 'var(--txt3)', fontWeight: 700, fontSize: '12px', fontFamily: 'Tajawal' }}>
                      {s.id === 'active' ? <Check size={16} /> : <X size={16} />}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Info Section */}
              <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)' }}>
                <label className="label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={12} /> {lang === 'ar' ? 'البيانات الشخصية' : 'Personal Info'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}><Users size={10} style={{ display: 'inline', marginLeft: '4px' }} /> {t.fields.name || (lang === 'ar' ? 'الاسم' : 'Name')}</label>
                    <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'} />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}><Mail size={10} style={{ display: 'inline', marginLeft: '4px' }} /> {t.fields.email || (lang === 'ar' ? 'البريد' : 'Email')}</label>
                    <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}><Phone size={10} style={{ display: 'inline', marginLeft: '4px' }} /> {t.fields.phone || (lang === 'ar' ? 'الهاتف' : 'Phone')}</label>
                    <input type="tel" className="input-field num" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.tenants_page.tax_id}</label>
                    <input className="input-field num" value={formData.tax_id} onChange={e => setFormData({ ...formData, tax_id: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Business Info Section */}
              <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <label className="label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Store size={12} /> {lang === 'ar' ? 'بيانات النشاط التجاري' : 'Business Info'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.tenants_page.business_name}</label>
                    <input className="input-field" value={formData.business_name} onChange={e => setFormData({ ...formData, business_name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.tenants_page.business_type}</label>
                    <input className="input-field" value={formData.business_type} onChange={e => setFormData({ ...formData, business_type: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)' }}>
                <label className="label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={12} /> {lang === 'ar' ? 'التخصيص' : 'Assignment'}</label>
                <div>
                  <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.tenants_page.unit}</label>
                  <select className="input-field" value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value })} required>
                    <option value="">{t.tenants_page.select_unit}</option>
                    {units.map(unit => <option key={unit.id} value={unit.id}>{unit.unit_number} - {unit.floor}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '8px' }}>{t.fields.notes || (lang === 'ar' ? 'ملاحظات' : 'Notes')}</label>
                <div style={{ position: 'relative' }}>
                  <textarea className="input-field" style={{ minHeight: '90px', resize: 'none', paddingBottom: '40px' }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                  <div style={{ position: 'absolute', left: '10px', bottom: '10px' }}>
                    <VoiceInput onTranscript={text => setFormData(p => ({ ...p, notes: p.notes + ' ' + text }))} size="sm" />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="ftb" style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '13px' }} onClick={() => { setShowModal(false); resetForm() }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="btn" style={{ flex: 2, height: '48px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Check size={16} />
                  {editingTenant ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : t.tenants_page.add_tenant}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
