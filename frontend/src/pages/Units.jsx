import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import firestoreService from '../services/firestoreService'
import toast from 'react-hot-toast'
import { 
  Building, Plus, Search, Filter, Edit, Trash2, 
  MapPin, Maximize, User, Phone, AlertCircle, 
  CheckCircle, Hammer, ShieldAlert, Layers, X,
  LayoutGrid, List
} from 'lucide-react'
import VoiceInput from '../components/VoiceInput'
import { useAuthStore } from '../store/authStore'
import PermissionGate from '../components/PermissionGate'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../services/translations'
import { useNotifications } from '../hooks/useNotifications'

export default function Units() {
  const { user } = useAuthStore()
  const { currentLanguage } = useLanguage()
  const location = useLocation()
  const lang = currentLanguage
  const t = translations[lang]
  const { sendNotification, notifyRoles } = useNotifications()

  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useState('table') // 'table' or 'grid'

  const [formData, setFormData] = useState({
    unit_number: '', floor: '', area: '', type: '',
    status: 'available', owner_name: '', owner_contact: '', description: ''
  })

  useEffect(() => { if (user) fetchUnits() }, [filterStatus, user])
  
  useEffect(() => {
    if (location.state?.editUnitId && units.length > 0) {
      const unit = units.find(u => u.id === location.state.editUnitId)
      if (unit) { 
        handleEdit(unit)
        window.history.replaceState({}, document.title) 
      }
    }
  }, [location.state, units])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      let filters = []
      if (filterStatus !== 'all') filters.push({ field: 'status', operator: '==', value: filterStatus })
      
      if (user?.role?.toLowerCase() === 'tenant' || user?.role?.toLowerCase() === 'unit_owner' || user?.role?.toLowerCase() === 'owner') {
        const assignedUnitId = user.unit_id || user.id
        filters.push({ field: 'id', operator: '==', value: assignedUnitId })
      }
      
      const data = await firestoreService.getAll('units', filters)
      setUnits(data || [])
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل تحميل بيانات الوحدات' : 'Failed to load units')
    } finally { 
      setLoading(false) 
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUnit) {
        await firestoreService.update('units', editingUnit.id, formData)
        
        // Notify if status changed to blocked
        if (formData.status !== editingUnit.status && formData.status === 'blocked') {
          notifyRoles(['admin', 'ceo', 'operations'], { 
            title: lang === 'ar' ? 'تنبيه: حظر وحدة' : 'Unit Blocked Alert',
            message: lang === 'ar' 
              ? `تم حظر الوحدة رقم ${editingUnit.unit_number} لأسباب فنية/إدارية`
              : `Unit ${editingUnit.unit_number} has been blocked for administrative reasons`,
            type: 'urgent',
            metadata: { unit_id: editingUnit.id, unit_number: editingUnit.unit_number }
          })
        }
        toast.success(lang === 'ar' ? 'تم تحديث الوحدة بنجاح' : 'Unit updated successfully')
      } else {
        await firestoreService.create('units', formData)
        toast.success(lang === 'ar' ? 'تم إضافة الوحدة بنجاح' : 'Unit added successfully')
      }
      setShowModal(false)
      resetForm()
      fetchUnits()
    } catch (error) { 
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving data') 
    }
  }

  const handleEdit = (unit) => {
    setEditingUnit(unit)
    setFormData({ 
      unit_number: unit.unit_number, 
      floor: unit.floor, 
      area: unit.area,
      type: unit.type, 
      status: unit.status, 
      owner_name: unit.owner_name || '',
      owner_contact: unit.owner_contact || '', 
      description: unit.description || '' 
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الوحدة؟' : 'Delete this unit?')) return
    try { 
      await firestoreService.delete('units', id)
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted')
      fetchUnits() 
    } catch (error) { 
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed') 
    }
  }

  const resetForm = () => {
    setFormData({ 
      unit_number: '', floor: '', area: '', type: '', 
      status: 'available', owner_name: '', owner_contact: '', description: '' 
    })
    setEditingUnit(null)
  }

  const filteredUnits = units.filter(unit =>
    (unit.unit_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(unit.floor || '').includes(searchTerm)
  )

  const stats = {
    total: units.length,
    rented: units.filter(u => u.status === 'rented' || u.status === 'owner_occupied').length,
    available: units.filter(u => u.status === 'available').length,
    maintenance: units.filter(u => u.status === 'maintenance').length,
    blocked: units.filter(u => u.status === 'blocked').length
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <Building size={24} />
          </div>
          <div>
            <h2>{t.units_page.title}</h2>
            <span>{t.units_page.subtitle}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <PermissionGate action="units.create">
            <button className="btn" onClick={() => { resetForm(); setShowModal(true) }}>
              <Plus size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
              {t.units_page.add_unit}
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="sg">
        <div className="sc bl gc">
          <div className="si2"><Building /></div>
          <div className="sv num">{stats.total}</div>
          <div className="sl">{t.units_page.total_units}</div>
        </div>
        <div className="sc gn gc">
          <div className="si2"><CheckCircle /></div>
          <div className="sv num">{stats.rented}</div>
          <div className="sl">{t.status.rented}</div>
        </div>
        <div className="sc rd gc">
          <div className="si2"><AlertCircle /></div>
          <div className="sv num">{stats.available}</div>
          <div className="sl">{t.status.available}</div>
        </div>
        <div className="sc pr gc">
          <div className="si2"><Hammer /></div>
          <div className="sv num">{stats.maintenance}</div>
          <div className="sl">{t.status.maintenance}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder={t.units_page.search_placeholder} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="ft">
          {['all', 'available', 'rented', 'maintenance', 'blocked'].map(s => (
            <button 
              key={s} 
              className={`ftb ${filterStatus === s ? 'active' : ''}`} 
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? t.common.all : t.status[s]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--bdr)', borderRadius: '10px', overflow: 'hidden' }}>
          <button 
            className={`ni ${viewMode === 'table' ? 'active' : ''}`} 
            style={{ padding: '8px 12px', border: 'none', background: viewMode === 'table' ? 'var(--gold)20' : 'transparent', color: viewMode === 'table' ? 'var(--gold)' : 'var(--txt2)' }}
            onClick={() => setViewMode('table')}
          >
            <List size={16} />
          </button>
          <button 
            className={`ni ${viewMode === 'grid' ? 'active' : ''}`} 
            style={{ padding: '8px 12px', border: 'none', background: viewMode === 'grid' ? 'var(--gold)20' : 'transparent', color: viewMode === 'grid' ? 'var(--gold)' : 'var(--txt2)' }}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="gc" style={{ overflow: 'hidden' }}>
          <table className="dt">
            <thead>
              <tr>
                <th>{t.units_page.unit_number}</th>
                <th>{t.units_page.type}</th>
                <th>{t.units_page.floor}</th>
                <th>{t.units_page.area}</th>
                <th>{t.units_page.owner}</th>
                <th>{t.fields.status}</th>
                <th style={{ textAlign: 'center' }}>{t.fields.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map(unit => (
                <tr key={unit.id}>
                  <td className="num" style={{ fontWeight: 800 }}>{unit.unit_number}</td>
                  <td style={{ fontWeight: 600 }}>{unit.type || '—'}</td>
                  <td className="num">{unit.floor || '—'}</td>
                  <td className="num">{unit.area ? `${unit.area} m²` : '—'}</td>
                  <td style={{ fontSize: '12px' }}>{unit.owner_name || '—'}</td>
                  <td>
                    <span className={`bs ${unit.status === 'available' ? 'vacant' : unit.status === 'rented' ? 'occupied' : unit.status}`}>
                      {t.status[unit.status] || unit.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                      <PermissionGate action="units.edit" resource={unit}>
                        <button className="hb" style={{ color: 'var(--blue)' }} onClick={() => handleEdit(unit)}><Edit size={14} /></button>
                      </PermissionGate>
                      <PermissionGate action="units.delete" resource={unit}>
                        <button className="hb" style={{ color: 'var(--red)' }} onClick={() => handleDelete(unit.id)}><Trash2 size={14} /></button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUnits.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Building /></div>
              <div className="empty-state-text">{t.messages.no_data}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {filteredUnits.map(unit => (
            <div key={unit.id} className="gc fu" style={{ padding: '20px', borderRadius: '20px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ fontWeight: 900, fontSize: '20px', color: 'var(--gold)' }} className="num">{unit.unit_number}</div>
                <span className={`bs ${unit.status === 'available' ? 'vacant' : unit.status === 'rented' ? 'occupied' : unit.status}`} style={{ fontSize: '9px' }}>
                  {t.status[unit.status] || unit.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--txt2)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={14} style={{ color: 'var(--txt3)' }} /> {unit.floor} - {unit.type}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Maximize size={14} style={{ color: 'var(--txt3)' }} /> <span className="num">{unit.area} m²</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} style={{ color: 'var(--txt3)' }} /> {unit.owner_name || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--bdr)', paddingTop: '16px' }}>
                <button 
                   className="ni" 
                   style={{ flex: 1, height: '32px', fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.2)' }}
                   onClick={() => handleEdit(unit)}
                >
                  <Edit size={12} style={{ marginLeft: lang === 'ar' ? '4px' : '0', marginRight: lang === 'ar' ? '0' : '4px' }} /> {t.common.edit}
                </button>
                <button 
                  className="ni" 
                  style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => handleDelete(unit.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Enhanced Units Modal ═══ */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowModal(false), resetForm())}>
          <div className="modal-content-diamond" style={{ maxWidth: '780px', padding: '0' }}>
            {/* Header */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--bdr)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--gold), #f0c040)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}>
                    <Building size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--txt)' }}>{editingUnit ? (lang === 'ar' ? 'تعديل بيانات الوحدة' : 'Edit Unit') : t.units_page.add_unit}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>{lang === 'ar' ? 'بروتوكول العقارات' : 'Real Estate Protocol'}</p>
                  </div>
                </div>
                <button className="modal-close-diamond" onClick={() => { setShowModal(false); resetForm() }}><X size={20} /></button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px' }}>
              {/* Status Selection */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={12} /> {t.fields.status || (lang === 'ar' ? 'الحالة' : 'Status')}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'available', label: t.status.available, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { id: 'rented', label: t.status.rented, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
                    { id: 'maintenance', label: t.status.maintenance, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
                    { id: 'blocked', label: t.status.blocked || (lang === 'ar' ? 'محظورة' : 'Blocked'), color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
                  ].map(s => (
                    <button type="button" key={s.id} onClick={() => setFormData({ ...formData, status: s.id })}
                      style={{ flex: 1, padding: '10px', borderRadius: '12px', border: formData.status === s.id ? `2px solid ${s.color}` : '1px solid var(--bdr)', background: formData.status === s.id ? s.bg : 'transparent', cursor: 'pointer', transition: 'all 0.3s', color: formData.status === s.id ? s.color : 'var(--txt3)', fontWeight: 700, fontSize: '11px', fontFamily: 'Tajawal', textAlign: 'center' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Info Section */}
              <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)' }}>
                <label className="label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={12} /> {lang === 'ar' ? 'بيانات الوحدة' : 'Unit Details'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.units_page.unit_number}</label>
                    <input className="input-field num" value={formData.unit_number} onChange={e => setFormData({ ...formData, unit_number: e.target.value })} required placeholder={lang === 'ar' ? 'مثال: A-101' : 'e.g. A-101'} />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.units_page.floor}</label>
                    <input className="input-field" value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} required placeholder={lang === 'ar' ? 'مثال: الدور الأول' : 'e.g. 1st Floor'} />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.units_page.area} (m²)</label>
                    <input type="number" className="input-field num" value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.units_page.type}</label>
                    <input className="input-field" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required placeholder={lang === 'ar' ? 'مثال: تجاري / مطعم' : 'e.g. Retail / Restaurant'} />
                  </div>
                </div>
              </div>

              {/* Owner Info Section */}
              <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <label className="label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={12} /> {lang === 'ar' ? 'بيانات المالك' : 'Owner Info'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.units_page.owner_name}</label>
                    <input className="input-field" value={formData.owner_name} onChange={e => setFormData({ ...formData, owner_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '9px', opacity: 0.7 }}>{t.units_page.owner_contact}</label>
                    <input type="tel" className="input-field num" value={formData.owner_contact} onChange={e => setFormData({ ...formData, owner_contact: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '28px' }}>
                <label className="label" style={{ marginBottom: '8px' }}>{t.fields.description || (lang === 'ar' ? 'الوصف' : 'Description')}</label>
                <div style={{ position: 'relative' }}>
                  <textarea className="input-field" style={{ minHeight: '80px', resize: 'none', paddingBottom: '40px' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  <div style={{ position: 'absolute', left: '10px', bottom: '10px' }}>
                    <VoiceInput onTranscript={text => setFormData(p => ({ ...p, description: p.description + ' ' + text }))} size="sm" />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="ftb" style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '13px' }} onClick={() => { setShowModal(false); resetForm() }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="btn" style={{ flex: 2, height: '48px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle size={16} />
                  {editingUnit ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : t.units_page.add_unit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
