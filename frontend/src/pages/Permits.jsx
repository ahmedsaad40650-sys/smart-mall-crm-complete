import { useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n/LanguageProvider';
import { usePermissions } from '../hooks/usePermissions';
import { usePermitData } from '../hooks/usePermitData';
import { usePermitFilters } from '../hooks/usePermitFilters';
import { usePermitActions } from '../hooks/usePermitActions';
import { permitTypes, statusLabels, workSchedules, approvalDepartments, getRequiredApprovals } from '../config/permitConfig';
import {
  FileCheck, Plus, Search, RefreshCw, Download, X, Eye, Edit, Trash2,
  Clock, CheckCircle, XCircle, AlertTriangle, Calendar, Users, Building,
  Filter, ChevronDown, ChevronUp, ArrowRight, Shield, Zap, BarChart,
  Hash, FileText, Star, Loader2, ClipboardCheck, History, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import PermitForm from '../components/permits/PermitForm';
import PermissionGate from '../components/PermissionGate';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PromptDialog from '../components/common/PromptDialog';
import * as XLSX from 'xlsx';

export default function Permits() {
  const { user } = useAuthStore();
  const { t, currentLanguage: lang } = useLanguage();
  const { can } = usePermissions();
  const permitsT = t.permits_page || {};

  const { permits, stats, units, tenants, refreshData, isRefreshing } = usePermitData(user);
  const { filters, setFilter, clearFilters, filteredPermits } = usePermitFilters(permits);
  const { createPermit, updatePermit, deletePermit, approvePermit, rejectPermit, approveDept, rejectDept, getApproverDept } = usePermitActions();

  const [showForm, setShowForm] = useState(false);
  const [editingPermit, setEditingPermit] = useState(null);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [promptDialog, setPromptDialog] = useState({ open: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const PERMITS_PER_PAGE = 12;
  const searchTimerRef = useRef(null);
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  const pTypes = useMemo(() => permitTypes(t), [t]);
  const sLabels = useMemo(() => statusLabels(t), [t]);
  const schedulesOptions = useMemo(() => workSchedules(t), [t]);
  const reqApprovals = useMemo(() => getRequiredApprovals(t), [t]);

  const paginatedPermits = useMemo(() => {
    const start = (currentPage - 1) * PERMITS_PER_PAGE;
    return filteredPermits.slice(start, start + PERMITS_PER_PAGE);
  }, [filteredPermits, currentPage]);
  const totalPages = Math.ceil(filteredPermits.length / PERMITS_PER_PAGE);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setLocalSearch(value);
    setCurrentPage(1);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setFilter('search', value), 300);
  }, [setFilter]);

  const handleFormSubmit = useCallback(async (formData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingPermit) {
        await updatePermit(editingPermit.id, formData);
        toast.success(lang === 'ar' ? 'تم تحديث التصريح بنجاح' : 'Permit updated');
      } else {
        await createPermit(formData, user);
        toast.success(lang === 'ar' ? 'تم إنشاء التصريح بنجاح' : 'Permit created');
      }
      setShowForm(false);
      refreshData();
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error saving permit');
    } finally { setIsSubmitting(false); }
  }, [editingPermit, updatePermit, createPermit, user, refreshData, isSubmitting, lang]);

  const handleApprove = useCallback(async (permit) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await approvePermit(permit.id, {}, permit, user);
      toast.success(lang === 'ar' ? 'تمت الموافقة بنجاح' : 'Approved successfully');
      refreshData();
    } catch (error) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); }
    finally { setIsSubmitting(false); }
  }, [approvePermit, user, refreshData, isSubmitting, lang]);

  const handleDeptApprove = useCallback(async (permit, dept) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await approveDept(permit.id, dept, '', user?.id, permit, user);
      toast.success(lang === 'ar' ? `تم اعتماد القسم بنجاح` : `Department approved`);
      refreshData();
    } catch (error) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); }
    finally { setIsSubmitting(false); }
  }, [approveDept, user, refreshData, isSubmitting, lang]);

  const handleDeptReject = useCallback(async (permit, dept) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await rejectDept(permit.id, dept, '', user?.id, permit, user);
      toast.success(lang === 'ar' ? `تم الرفض بنجاح` : `Department rejected`);
      refreshData();
    } catch (error) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); }
    finally { setIsSubmitting(false); }
  }, [rejectDept, user, refreshData, isSubmitting, lang]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDialog.id) return;
    try {
      await deletePermit(confirmDialog.id);
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted');
      setConfirmDialog({open:false, id:null});
      refreshData();
    } catch (error) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); }
  }, [confirmDialog.id, deletePermit, refreshData, lang]);

  const handleRejectConfirm = useCallback(async (reason) => {
    if (!promptDialog.id) return;
    const permit = permits.find(p => p.id === promptDialog.id);
    try {
      await rejectPermit(promptDialog.id, reason, permit, user);
      toast.success(lang === 'ar' ? 'تم الرفض بنجاح' : 'Rejected');
      setPromptDialog({open:false, id:null});
      refreshData();
    } catch (error) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); }
  }, [promptDialog.id, rejectPermit, permits, user, refreshData, lang]);

  const handleExport = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();
      const headers = [
        lang === 'ar' ? 'رقم التصريح' : 'Permit #',
        lang === 'ar' ? 'النوع' : 'Type',
        lang === 'ar' ? 'الحالة' : 'Status',
        lang === 'ar' ? 'الوحدة' : 'Unit',
        lang === 'ar' ? 'التاريخ' : 'Date'
      ];
      const data = [headers];
      filteredPermits.forEach(p => {
        const type = pTypes.find(t => t.id === p.permit_type);
        data.push([p.permit_number || '', type?.label || p.permit_type, sLabels[p.status]?.label || p.status, p.unit_id || '', p.created_at || '']);
      });
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Permits');
      XLSX.writeFile(wb, `Permits_${Date.now()}.xlsx`);
      toast.success(lang === 'ar' ? 'تم التصدير' : 'Exported');
    } catch { toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed'); }
  }, [filteredPermits, pTypes, sLabels, lang]);

  const getDeptStatus = (permit, deptId) => {
    const approval = permit?.approvals?.[deptId];
    if (!approval) return { status: 'pending', icon: Clock, color: 'warn' };
    if (approval.status === 'approved') return { status: 'approved', icon: CheckCircle, color: 'active' };
    if (approval.status === 'rejected') return { status: 'rejected', icon: XCircle, color: 'cancelled' };
    return { status: 'pending', icon: Clock, color: 'warn' };
  };

  const userDept = getApproverDept(user);
  
  const statusFlow = {
    pending: { label: t.status.pending, color: 'warn', icon: Clock },
    under_review: { label: lang === 'ar' ? 'قيد المراجعة' : 'Under Review', color: 'processing', icon: Eye },
    approved: { label: lang === 'ar' ? 'معتمد' : 'Approved', color: 'active', icon: CheckCircle },
    rejected: { label: lang === 'ar' ? 'مرفوض' : 'Rejected', color: 'cancelled', icon: XCircle },
    completed: { label: t.status.completed, color: 'active', icon: CheckCircle },
    expired: { label: lang === 'ar' ? 'منتهي' : 'Expired', color: 'inactive', icon: AlertTriangle }
  }

  if (isRefreshing && !permits.length) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2>{lang === 'ar' ? 'نظام التصاريح الذكي' : 'Smart Permit System'}</h2>
            <span>{lang === 'ar' ? 'إدارة واعتمادات تصاريح المول' : 'Multi-Department Approval Workflow'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="ni" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button className="ni" onClick={handleExport}>
            <Download size={16} />
          </button>
          <PermissionGate action="permits.create">
            <button className="btn" onClick={() => { setEditingPermit(null); setShowForm(true); }}>
              <Plus size={16} style={{ marginLeft: lang === 'ar' ? '8px' : '0', marginRight: lang === 'ar' ? '0' : '8px' }} />
              {lang === 'ar' ? 'تصريح جديد' : 'New Permit'}
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="sc bl gc"><div className="si2"><Activity /></div><div className="sv num">{stats?.total || 0}</div><div className="sl">{lang === 'ar' ? 'إجمالي التصاريح' : 'Total Permits'}</div></div>
        <div className="sc or gc"><div className="si2"><Clock /></div><div className="sv num">{stats?.pending || 0}</div><div className="sl">{t.status.pending}</div></div>
        <div className="sc pr gc"><div className="si2"><Eye /></div><div className="sv num">{stats?.under_review || 0}</div><div className="sl">{lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}</div></div>
        <div className="sc gn gc"><div className="si2"><CheckCircle /></div><div className="sv num">{stats?.approved || 0}</div><div className="sl">{lang === 'ar' ? 'المعتمدة' : 'Approved'}</div></div>
      </div>

      {/* Filters Bar */}
      <div className="gc" style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="hs" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} />
          <input type="text" placeholder={lang === 'ar' ? 'بحث بالرقم أو النوع...' : 'Search by # or type...'} value={localSearch} onChange={handleSearchChange} />
        </div>
        <div className="ft">
          {['all', 'pending', 'under_review', 'approved'].map(s => (
            <button key={s} className={`ftb ${filters.status === (s === 'all' ? '' : s) ? 'active' : ''}`} onClick={() => setFilter('status', s === 'all' ? '' : s)}>
              {s === 'all' ? t.common.all : (statusFlow[s]?.label || s)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Permits */}
      {filteredPermits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Shield /></div>
          <div className="empty-state-text">{lang === 'ar' ? 'لا توجد تصاريح مطابقة' : 'No matching permits'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {paginatedPermits.map(permit => {
            const type = pTypes.find(t => t.id === permit.permit_type) || pTypes[0]
            const status = statusFlow[permit.status] || statusFlow.pending
            const Icon = status.icon
            const isExpanded = expandedCard === permit.id

            return (
              <div key={permit.id} className="gc" style={{ padding: 0, overflow: 'hidden', border: isExpanded ? '1px solid var(--gold)50' : '1px solid var(--bdr)' }}>
                <div style={{ height: '4px', background: `var(--${status.color === 'active' ? 'green' : status.color === 'warn' ? 'gold' : status.color === 'processing' ? 'blue' : 'red'})` }} />
                
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                       <div className="gg" style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
                          <FileText size={20} />
                       </div>
                       <div>
                          <div className="num" style={{ fontWeight: 900, fontSize: '15px' }}>{permit.permit_number || `PER-${permit.id.slice(0,6)}`}</div>
                          <div style={{ fontSize: '11px', color: 'var(--txt3)', fontWeight: 700, textTransform: 'uppercase' }}>{type.label}</div>
                       </div>
                    </div>
                    <span className={`bs ${status.color}`} style={{ height: 'fit-content' }}>
                      <Icon size={12} style={{ marginRight: lang === 'ar' ? '0' : '4px', marginLeft: lang === 'ar' ? '4px' : '0' }} />
                      {status.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div className="gg" style={{ padding: '12px', borderRadius: '12px' }}>
                      <label className="label" style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}>{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                      <div style={{ fontWeight: 800 }}>{permit.unit_id || '—'}</div>
                    </div>
                    <div className="gg" style={{ padding: '12px', borderRadius: '12px' }}>
                      <label className="label" style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}>{lang === 'ar' ? 'التوقيت' : 'Schedule'}</label>
                      <div style={{ fontWeight: 800, fontSize: '11px' }}>{schedulesOptions.find(s => s.id === permit.work_schedule)?.label || '—'}</div>
                    </div>
                  </div>

                  {/* Workflow Visualiser */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: '8px', letterSpacing: '1px' }}>
                      {lang === 'ar' ? 'مسار الاعتمادات' : 'Approval Workflow'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {approvalDepartments.map(dept => {
                        const ds = getDeptStatus(permit, dept.id)
                        const DIcon = ds.icon
                        return (
                          <div key={dept.id} className={`bs ${ds.color}`} style={{ fontSize: '9px', padding: '4px 8px' }}>
                            <DIcon size={10} style={{ marginRight: lang === 'ar' ? '0' : '4px', marginLeft: lang === 'ar' ? '4px' : '0' }} />
                            {lang === 'ar' ? dept.label_ar : dept.label_en}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="gg" style={{ padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--bdr)' }}>
                       <div style={{ fontSize: '11px', fontWeight: 800, marginBottom: '12px', color: 'var(--gold)' }}>{lang === 'ar' ? 'تفاصيل الاعتماد' : 'Approval Execution'}</div>
                       {approvalDepartments.map(dept => {
                          const ds = getDeptStatus(permit, dept.id)
                          const canAction = userDept === dept.id && ds.status === 'pending' && can('permits.dept_approve')
                          return (
                            <div key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
                               <span style={{ fontSize: '12px', fontWeight: 600 }}>{lang === 'ar' ? dept.label_ar : dept.label_en}</span>
                               {canAction ? (
                                 <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn" style={{ height: '28px', fontSize: '10px', background: 'var(--green)' }} onClick={() => handleDeptApprove(permit, dept.id)}>✓</button>
                                    <button className="btn" style={{ height: '28px', fontSize: '10px', background: 'var(--red)' }} onClick={() => handleDeptReject(permit, dept.id)}>✗</button>
                                 </div>
                               ) : (
                                 <span className={`bs ${ds.color}`} style={{ fontSize: '9px' }}>{ds.status}</span>
                               )}
                            </div>
                          )
                       })}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="ftb" style={{ flex: 1 }} onClick={() => setExpandedCard(isExpanded ? null : permit.id)}>
                       <Eye size={14} style={{ marginRight: '6px' }} />
                       {lang === 'ar' ? 'العرض' : 'Inspect'}
                    </button>
                    {permit.status === 'pending' && can('permits.approve') && (
                      <button className="btn" style={{ flex: 1, background: 'var(--green)' }} onClick={() => handleApprove(permit)}>✓</button>
                    )}
                    <PermissionGate action="permits.edit" resource={permit}>
                      <button className="btn" style={{ width: '44px' }} onClick={() => { setEditingPermit(permit); setShowForm(true); }}><Edit size={14}/></button>
                    </PermissionGate>
                    <PermissionGate action="permits.delete" resource={permit}>
                      <button className="btn" style={{ width: '44px', background: 'var(--red)' }} onClick={() => setConfirmDialog({ open: true, id: permit.id })}><Trash2 size={14}/></button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '32px' }}>
           <button className="ni" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}><ChevronRight size={18}/></button>
           <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '12px', color: 'var(--txt3)' }}>{currentPage} / {totalPages}</div>
           <button className="ni" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}><ChevronLeft size={18}/></button>
        </div>
      )}

      {showForm && (
        <PermitForm
          permit={editingPermit}
          units={units}
          tenants={tenants}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
          permitTypes={pTypes}
          workSchedules={schedulesOptions}
          isSubmitting={isSubmitting}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title={lang === 'ar' ? 'حذف التصريح' : 'Delete Permit'}
        message={lang === 'ar' ? 'هل أنت متأكد من حذف هذا التصريح؟' : 'Are you sure?'}
      />
      <PromptDialog
        open={promptDialog.open}
        onClose={() => setPromptDialog({ open: false, id: null })}
        onConfirm={handleRejectConfirm}
        title={lang === 'ar' ? 'رفض التصريح' : 'Reject Permit'}
        message={lang === 'ar' ? 'يرجى كتابة سبب الرفض:' : 'Rejection reason:'}
      />
    </div>
  );
}
