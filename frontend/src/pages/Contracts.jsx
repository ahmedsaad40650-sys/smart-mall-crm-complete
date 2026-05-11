import { useEffect, useState, useMemo } from 'react'
import firestoreService from '../services/firestoreService'
import storageService from '../services/storageService'
import toast from 'react-hot-toast'
import { 
  Plus, FileText, Calendar, DollarSign, Search, Paperclip, Eye, Download, 
  Edit, Trash2, ShieldCheck, Briefcase, User, Building, Clock, X,
  FileCheck, AlertTriangle, FileSignature, ChevronDown, ChevronUp
} from 'lucide-react'
import FileUpload from '../components/FileUpload'
import VoiceInput from '../components/VoiceInput'
import { useAuthStore } from '../store/authStore'
import PermissionGate from '../components/PermissionGate'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../services/translations'

export default function Contracts() {
  const { user } = useAuthStore()
  const { currentLanguage } = useLanguage()
  const lang = currentLanguage
  const t = translations[lang]

  const [contracts, setContracts] = useState([])
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [expandedContract, setExpandedContract] = useState(null)
  const [attachments, setAttachments] = useState({})
  
  const initialForm = {
    tenant_id: '',
    unit_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    deposit: '',
    payment_day: 1,
    terms: '',
    notes: ''
  }

  const [formData, setFormData] = useState(initialForm)

  const tempContractId = useMemo(() => {
    return editingContract?.id || `temp-${Date.now()}`
  }, [editingContract, showModal])

  useEffect(() => {
    if (user) {
      fetchContracts()
      fetchTenants()
      fetchUnits()
    }
  }, [user])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const data = await firestoreService.getAll('contracts')
      setContracts(data || [])
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل تحميل العقود' : 'Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const data = await firestoreService.getAll('tenants')
      setTenants(data || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  const fetchUnits = async () => {
    try {
      // Show available units + the one currently in editing contract
      const data = await firestoreService.getAll('units')
      setUnits(data || [])
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const fetchAttachments = async (contractId) => {
    try {
      const files = await storageService.listFolder(`contracts/${contractId}`)
      setAttachments(prev => ({
        ...prev,
        [contractId]: files || []
      }))
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }

  const toggleExpand = async (contractId) => {
    if (expandedContract === contractId) {
      setExpandedContract(null)
    } else {
      setExpandedContract(contractId)
      if (!attachments[contractId]) {
        await fetchAttachments(contractId)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let contractId = editingContract?.id
      const payload = {
        ...formData,
        updated_at: new Date().toISOString()
      }

      if (editingContract) {
        await firestoreService.update('contracts', editingContract.id, payload)
        toast.success(lang === 'ar' ? 'تم تحديث العقد بنجاح' : 'Contract updated')
      } else {
        const contract_number = `CON-${Date.now().toString().slice(-6)}`
        contractId = await firestoreService.create('contracts', {
          ...payload,
          contract_number,
          status: 'active',
          created_at: new Date().toISOString()
        })
        // Update unit status
        if (formData.unit_id) {
          await firestoreService.update('units', formData.unit_id, { status: 'rented' })
        }
        toast.success(lang === 'ar' ? 'تم إنشاء العقد بنجاح' : 'Contract created')
      }

      // Handle file migration if needed (simplified here)
      setShowModal(false)
      resetForm()
      fetchContracts()
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving data')
    }
  }

  const handleEdit = (contract) => {
    setEditingContract(contract)
    setFormData({
      tenant_id: contract.tenant_id,
      unit_id: contract.unit_id,
      start_date: contract.start_date?.split('T')[0] || '',
      end_date: contract.end_date?.split('T')[0] || '',
      monthly_rent: contract.monthly_rent,
      deposit: contract.deposit,
      payment_day: contract.payment_day,
      terms: contract.terms || '',
      notes: contract.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا العقد؟' : 'Delete this contract?')) return
    try {
      const contract = contracts.find(c => c.id === id)
      await firestoreService.delete('contracts', id)
      if (contract?.unit_id) {
        await firestoreService.update('units', contract.unit_id, { status: 'available' })
      }
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted')
      fetchContracts()
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed')
    }
  }

  const resetForm = () => {
    setFormData(initialForm)
    setEditingContract(null)
    setUploadedFiles([])
  }

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    return tenant ? tenant.name : (lang === 'ar' ? 'غير معروف' : 'Unknown')
  }

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId)
    return unit ? unit.unit_number : '—'
  }

  const filteredContracts = contracts.filter(contract => {
    const name = getTenantName(contract.tenant_id).toLowerCase()
    const num = (contract.contract_number || '').toLowerCase()
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expired: contracts.filter(c => c.status === 'expired').length
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <FileSignature size={24} />
          </div>
          <div>
            <h2>{t.contracts_page.title}</h2>
            <span>{t.contracts_page.subtitle}</span>
          </div>
        </div>
        <PermissionGate action="contracts.create">
          <button className="btn" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
            {t.contracts_page.add_contract}
          </button>
        </PermissionGate>
      </div>

      {/* Stats Overview */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="sc bl gc">
          <div className="si2"><FileText /></div>
          <div className="sv num">{stats.total}</div>
          <div className="sl">{t.contracts_page.total_contracts}</div>
        </div>
        <div className="sc gn gc">
          <div className="si2"><FileCheck /></div>
          <div className="sv num">{stats.active}</div>
          <div className="sl">{t.status.active}</div>
        </div>
        <div className="sc rd gc">
          <div className="si2"><AlertTriangle /></div>
          <div className="sv num">{stats.expired}</div>
          <div className="sl">{t.status.expired}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input 
            type="text" 
            placeholder={t.contracts_page.search_placeholder} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="ft">
          {['all', 'active', 'expired'].map(s => (
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

      {/* Table Container */}
      <div className="gc" style={{ overflow: 'hidden' }}>
        <table className="dt">
          <thead>
            <tr>
              <th>{t.contracts_page.contract_number}</th>
              <th>{t.payments_page.tenant}</th>
              <th>{t.tenants_page.unit}</th>
              <th>{lang === 'ar' ? 'الإيجار' : 'Rent'}</th>
              <th>{t.contracts_page.start_date}</th>
              <th>{t.contracts_page.end_date}</th>
              <th>{t.fields.status}</th>
              <th style={{ textAlign: 'center' }}>{t.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(contract => (
              <>
                <tr key={contract.id}>
                  <td className="num" style={{ fontWeight: 800 }}>{contract.contract_number}</td>
                  <td style={{ fontWeight: 600 }}>{getTenantName(contract.tenant_id)}</td>
                  <td className="num">{getUnitNumber(contract.unit_id)}</td>
                  <td className="num" style={{ color: 'var(--green)', fontWeight: 800 }}>{Number(contract.monthly_rent).toLocaleString()}</td>
                  <td className="num" style={{ fontSize: '11px' }}>{new Date(contract.start_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td className="num" style={{ fontSize: '11px' }}>{new Date(contract.end_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td>
                    <span className={`bs ${contract.status === 'active' ? 'active' : 'expired'}`}>
                      {t.status[contract.status] || contract.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                      <button className="hb" onClick={() => toggleExpand(contract.id)}>
                        {expandedContract === contract.id ? <ChevronUp size={14} /> : <Eye size={14} />}
                      </button>
                      <PermissionGate action="contracts.edit" resource={contract}>
                        <button className="hb" style={{ color: 'var(--blue)' }} onClick={() => handleEdit(contract)}><Edit size={14} /></button>
                      </PermissionGate>
                      <PermissionGate action="contracts.delete" resource={contract}>
                        <button className="hb" style={{ color: 'var(--red)' }} onClick={() => handleDelete(contract.id)}><Trash2 size={14} /></button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
                {expandedContract === contract.id && (
                  <tr className="fu">
                    <td colSpan="8" style={{ padding: '0 20px 20px' }}>
                      <div className="gg" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bdr)' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                            <div>
                               <label className="label" style={{ opacity: 0.5 }}>{t.contracts_page.deposit}</label>
                               <div className="num" style={{ fontWeight: 800 }}>{Number(contract.deposit).toLocaleString()} ج.م</div>
                            </div>
                            <div>
                               <label className="label" style={{ opacity: 0.5 }}>{t.contracts_page.payment_day}</label>
                               <div style={{ fontWeight: 800 }}>{lang === 'ar' ? `يوم ${contract.payment_day} من كل شهر` : `Day ${contract.payment_day} of month`}</div>
                            </div>
                            <div>
                               <label className="label" style={{ opacity: 0.5 }}>{t.contracts_page.terms}</label>
                               <div style={{ fontSize: '12px', color: 'var(--txt2)' }}>{contract.terms || '—'}</div>
                            </div>
                         </div>
                         {attachments[contract.id]?.length > 0 && (
                           <div>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--gold)', marginBottom: '12px', textTransform: 'uppercase' }}>📎 {t.contracts_page.attachments}</div>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {attachments[contract.id].map(file => (
                                  <button key={file.id} className="ni" style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => window.open(file.url, '_blank')}>
                                    <Paperclip size={14} />
                                    <span style={{ fontSize: '11px', fontWeight: 700 }}>{file.original_name || file.name}</span>
                                    <Download size={12} />
                                  </button>
                                ))}
                              </div>
                           </div>
                         )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filteredContracts.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText /></div>
            <div className="empty-state-text">{t.messages.no_data}</div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowModal(false), resetForm())}>
          <div className="modal-content-diamond" style={{ maxWidth: '800px' }}>
            <div className="modal-header-diamond">
              <div>
                <h3 className="modal-title-diamond">{editingContract ? t.common.edit : t.contracts_page.add_contract}</h3>
                <p style={{ fontSize: '10px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>Legal Protocol</p>
              </div>
              <button className="modal-close-diamond" onClick={() => { setShowModal(false); resetForm() }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label className="label">{t.payments_page.tenant}</label>
                  <select className="input-field" value={formData.tenant_id} onChange={e => setFormData({ ...formData, tenant_id: e.target.value })} required>
                    <option value="">{t.payments_page.select_tenant}</option>
                    {tenants.map(tn => <option key={tn.id} value={tn.id}>{tn.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t.tenants_page.unit}</label>
                  <select className="input-field" value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value })} required>
                    <option value="">{t.tenants_page.select_unit}</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.floor}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t.contracts_page.start_date}</label>
                  <input type="date" className="input-field" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t.contracts_page.end_date}</label>
                  <input type="date" className="input-field" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'الإيجار الشهري' : 'Monthly Rent'}</label>
                  <input type="number" className="input-field num" value={formData.monthly_rent} onChange={e => setFormData({ ...formData, monthly_rent: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t.contracts_page.deposit}</label>
                  <input type="number" className="input-field num" value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t.contracts_page.payment_day}</label>
                  <input type="number" min="1" max="31" className="input-field num" value={formData.payment_day} onChange={e => setFormData({ ...formData, payment_day: e.target.value })} required />
                </div>
                <div>
                  <label className="label">{t.fields.status}</label>
                  <select className="input-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">{t.status.active}</option>
                    <option value="expired">{t.status.expired}</option>
                    <option value="cancelled">{t.status.cancelled}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label">{t.contracts_page.terms}</label>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="input-field" 
                    style={{ minHeight: '80px', resize: 'none' }} 
                    value={formData.terms} 
                    onChange={e => setFormData({ ...formData, terms: e.target.value })} 
                  />
                  <div style={{ position: 'absolute', left: '10px', bottom: '10px' }}>
                    <VoiceInput onTranscript={text => setFormData(p => ({ ...p, terms: p.terms + ' ' + text }))} size="sm" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label">📎 {t.contracts_page.attachments}</label>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--bdr)', borderRadius: '16px', padding: '20px' }}>
                  <FileUpload referenceType="contract" referenceId={tempContractId} onFilesUploaded={files => setUploadedFiles(files)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="ftb" style={{ flex: 1, height: '44px' }} onClick={() => { setShowModal(false); resetForm() }}>{t.common.cancel}</button>
                <button type="submit" className="btn" style={{ flex: 2, height: '44px' }}>
                  <FileCheck size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
                  {editingContract ? t.common.save : t.contracts_page.add_contract}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
