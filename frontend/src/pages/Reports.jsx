import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Filter, Calendar, TrendingUp,
  DollarSign, Users, Building, Wrench, PieChart,
  BarChart3, LineChart, Activity, AlertCircle,
  FileSpreadsheet, Printer, Share2, Eye, Settings,
  ChevronDown, CheckCircle, Clock, Target, Award,
  ArrowUpRight, ArrowDownRight, Zap, TrendingDown,
  X, Search, ShieldCheck, BadgeCheck, Plus, History,
  Layout, BookOpen, Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as RechartsLineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { translations } from '../services/translations';
import firestoreService from '../services/firestoreService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useLanguage } from '../i18n/LanguageProvider';

export default function Reports() {
  const { currentLanguage: lang } = useLanguage();
  const t = translations[lang] || translations['en'];
  const { user } = useAuthStore();
  
  const [selectedReport, setSelectedReport] = useState('financial');
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const reportTemplates = [
    { id: 'financial', name: lang === 'ar' ? 'التحليل المالي' : 'Financial Matrix', icon: DollarSign, desc: lang === 'ar' ? 'الإيرادات والنفقات' : 'Revenue & OPEX' },
    { id: 'occupancy', name: lang === 'ar' ? 'مصفوفة الإشغال' : 'Occupancy Analytics', icon: Building, desc: lang === 'ar' ? 'تحليل الوحدات' : 'Space utilization' },
    { id: 'maintenance', name: lang === 'ar' ? 'سجل العمليات' : 'Maintenance Log', icon: Wrench, desc: lang === 'ar' ? 'إحصائيات الإصلاح' : 'Technical costs' },
    { id: 'tenants', name: lang === 'ar' ? 'دليل المستأجرين' : 'Tenant Registry', icon: Users, desc: lang === 'ar' ? 'بيانات العقود' : 'Portfolio data' },
    { id: 'performance', name: lang === 'ar' ? 'مؤشرات الأداء' : 'Performance KPIs', icon: Zap, desc: lang === 'ar' ? 'الكفاءة العامة' : 'Efficiency rates' },
    { id: 'footfall', name: lang === 'ar' ? 'تدفق الزوار' : 'Traffic Matrix', icon: Activity, desc: lang === 'ar' ? 'حركة المرور' : 'Visitor load' }
  ];

  useEffect(() => { if (user) fetchAllData() }, [user, dateRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [units, payments, maintenance, tenants, gateVisitors] = await Promise.all([
        firestoreService.getAll('units').catch(() => []),
        firestoreService.getAll('payments').catch(() => []),
        firestoreService.getAll('maintenance_requests').catch(() => []),
        firestoreService.getAll('tenants').catch(() => []),
        firestoreService.getAll('gate_visitors').catch(() => [])
      ]);

      const revenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const mCosts = maintenance.reduce((sum, m) => sum + (parseFloat(m.estimated_cost || 0)), 0);
      const monthNames = lang === 'ar' ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] : ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

      const revByMonth = {};
      payments.forEach(p => {
        const d = p.payment_date || p.date || p.created_at;
        if (!d) return;
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) revByMonth[dt.getMonth()] = (revByMonth[dt.getMonth()] || 0) + (parseFloat(p.amount) || 0);
      });

      const expByMonth = {};
      maintenance.forEach(m => {
        const d = m.created_at || m.date;
        if (!d) return;
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) expByMonth[dt.getMonth()] = (expByMonth[dt.getMonth()] || 0) + (parseFloat(m.estimated_cost) || 0);
      });

      const months = [0,1,2,3,4,5,6,7,8,9,10,11].slice(-6);
      const finChart = months.map(m => ({ name: monthNames[m], rev: revByMonth[m] || 0, exp: expByMonth[m] || 0 }));
      const rentedUnits = units.filter(u => u.status === 'rented' || u.status === 'owner_occupied');
      const occRate = units.length > 0 ? Math.round((rentedUnits.length / units.length) * 100) : 0;

      // Calculate real tenant growth by comparing recent vs older tenants
      const now = new Date();
      const newTenants30d = tenants.filter(t => {
        const created = new Date(t.created_at);
        return (now - created) / (1000*60*60*24) <= 30;
      }).length;
      const totalBefore = tenants.length - newTenants30d;
      const tenantGrowth = totalBefore > 0 ? Math.round((newTenants30d / totalBefore) * 100 * 10) / 10 : 0;

      setReportData({
        financial: { revenue, expenses: mCosts, profit: revenue - mCosts, chart: finChart },
        occupancy: { rate: occRate, total: units.length, occupied: rentedUnits.length, vacant: units.length - rentedUnits.length, chart: [{name: 'Occupied', val: rentedUnits.length}, {name: 'Vacant', val: units.length - rentedUnits.length}] },
        maintenance: { total: maintenance.length, completed: maintenance.filter(m=>m.status==='completed').length, pending: maintenance.filter(m=>m.status==='pending').length, inProgress: maintenance.filter(m=>m.status==='in_progress').length, totalCost: mCosts, resolutionRate: maintenance.length > 0 ? Math.round((maintenance.filter(m=>m.status==='completed').length / maintenance.length) * 100) : 0 },
        tenants: { total: tenants.length, active: tenants.filter(t=>t.status==='active').length, growth: tenantGrowth },
        performance: { collectionRate: payments.length > 0 ? Math.round((payments.filter(p=>p.status==='paid').length / payments.length) * 100) : 0, occupancyRate: occRate },
        footfall: { total: gateVisitors.reduce((s,g)=>(s+(parseInt(g.main?.morning||0)+parseInt(g.main?.evening||0))), 0), avgDaily: gateVisitors.length > 0 ? Math.round(gateVisitors.reduce((s,g)=>(s+(parseInt(g.main?.morning||0)+parseInt(g.main?.evening||0))), 0)/gateVisitors.length) : 0 }
      });
    } catch (err) { toast.error('Error loading report matrices') }
    finally { setLoading(false) }
  };

  const exportExcel = () => {
    if (!reportData) return;
    try {
      const wb = XLSX.utils.book_new();
      const rows = [["DIAMOND REPORT PROTOCOL"], [selectedReport.toUpperCase()], [new Date().toLocaleString()]];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Matrix Log");
      XLSX.writeFile(wb, `REPORT_${Date.now()}.xlsx`);
      toast.success('Matrix Exported');
    } catch (e) { toast.error('Export failed') }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h2>{lang === 'ar' ? 'مركز التقارير الماسية' : 'Diamond Reports Control'}</h2>
            <span>{lang === 'ar' ? 'تحليل المصفوفات والبيانات الحية للمول' : 'Global data matrix and intelligence console'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
             <button className="ni" onClick={() => setShowCustomModal(true)}><Plus size={16}/></button>
             <button className="ni" onClick={exportExcel}><Download size={16}/></button>
             <div className="ft" style={{ padding: '0 12px' }}>
                <Calendar size={14} style={{ marginRight:'8px' }} />
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ background:'none', border:'none', color:'inherit', fontSize:'11px', fontWeight:900, textTransform:'uppercase' }}>
                   <option value="today">Today</option>
                   <option value="week">Week</option>
                   <option value="month">Month</option>
                </select>
             </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        {/* Templates Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Intelligence Matrices</div>
            {reportTemplates.map(rep => {
                const Icon = rep.icon;
                const active = selectedReport === rep.id;
                return (
                    <button key={rep.id} onClick={() => setSelectedReport(rep.id)} className={`gg ${active ? 'active' : ''}`} style={{ padding: '16px', borderRadius: '14px', border: active ? '1px solid var(--gold)50' : '1px solid var(--bdr)', display: 'flex', alignItems: 'center', gap: '12px', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                        <div className="gg" style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--gold)' : 'var(--txt3)' }}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: active ? 'var(--txt)' : 'var(--txt2)' }}>{rep.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--txt3)' }}>{rep.desc}</div>
                        </div>
                    </button>
                )
            })}
        </div>

        {/* Viewport content */}
        <div className="gc" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                   <h3 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{reportTemplates.find(r => r.id === selectedReport)?.name}</h3>
                   <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--gold)', letterSpacing: '2px', marginTop: '4px' }}>PROTOCOL: LIVE ANALYTICS GATEWAY</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="ftb" onClick={() => window.print()}><Printer size={14} style={{ marginRight: '6px' }} /> Print</button>
                    <button className="ftb" onClick={exportExcel}><FileSpreadsheet size={14} style={{ marginRight: '6px' }} /> Export</button>
                </div>
            </div>

            {/* Content Logic */}
            <div style={{ flex: 1 }}>
                {selectedReport === 'financial' && reportData?.financial && (
                    <div className="animate-fade-in">
                        <div className="sg" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '32px' }}>
                             <div className="sc bl gc"><div className="si2"><DollarSign /></div><div className="sv num">{reportData.financial.revenue.toLocaleString()}</div><div className="sl">GROSS REVENUE</div></div>
                             <div className="sc rd gc"><div className="si2"><TrendingDown /></div><div className="sv num">{reportData.financial.expenses.toLocaleString()}</div><div className="sl">TOTAL OPEX</div></div>
                             <div className="sc gn gc"><div className="si2"><Zap /></div><div className="sv num">{reportData.financial.profit.toLocaleString()}</div><div className="sl">NET PROFIT</div></div>
                        </div>
                        <div className="gc gg" style={{ height: '350px', padding: '24px' }}>
                             <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={reportData.financial.chart}>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bdr)" />
                                     <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                     <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                     <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: '12px' }} />
                                     <Area type="monotone" dataKey="rev" fill="var(--gold)20" stroke="var(--gold)" strokeWidth={3} />
                                     <Area type="monotone" dataKey="exp" fill="var(--red)10" stroke="var(--red)" strokeWidth={2} strokeDasharray="5 5" />
                                 </AreaChart>
                             </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {selectedReport === 'occupancy' && reportData?.occupancy && (
                    <div className="animate-fade-in">
                        <div className="sg" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '32px' }}>
                            <div className="sc bl gc"><div className="si2"><Building /></div><div className="sv num">{reportData.occupancy.total}</div><div className="sl">TOTAL UNITS</div></div>
                            <div className="sc gn gc"><div className="si2"><CheckCircle /></div><div className="sv num">{reportData.occupancy.occupied}</div><div className="sl">LEASED</div></div>
                            <div className="sc rd gc"><div className="si2"><DoorOpen size={20}/></div><div className="sv num">{reportData.occupancy.vacant}</div><div className="sl">VACANT</div></div>
                            <div className="sc or gc"><div className="si2"><Target /></div><div className="sv num">{reportData.occupancy.rate}%</div><div className="sl">LOAD RATE</div></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
                             <div className="gc gg" style={{ height: '300px' }}>
                                 <ResponsiveContainer>
                                     <RechartsPieChart>
                                         <Pie data={reportData.occupancy.chart} dataKey="val" innerRadius={60} outerRadius={80} paddingAngle={10}>
                                             <Cell fill="var(--gold)" />
                                             <Cell fill="var(--bg2)" />
                                         </Pie>
                                         <Tooltip />
                                     </RechartsPieChart>
                                 </ResponsiveContainer>
                             </div>
                             <div className="gc gg" style={{ padding: '24px' }}>
                                 <h4 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '16px' }}>METRIC INSIGHTS</h4>
                                 <div className={`bs ${reportData.occupancy.rate >= 70 ? 'active' : 'warn'}`} style={{ marginBottom: '12px' }}>{reportData.occupancy.rate >= 70 ? 'Occupancy: Healthy' : 'Occupancy: Below Target'} ({reportData.occupancy.rate}%)</div>
                                 <p style={{ fontSize: '13px', color: 'var(--txt3)', lineHeight: '1.6' }}>{reportData.occupancy.occupied} {lang === 'ar' ? 'وحدة مؤجرة من أصل' : 'units leased out of'} {reportData.occupancy.total} {lang === 'ar' ? 'وحدة. الوحدات المتاحة:' : 'total units. Available:'} {reportData.occupancy.vacant}</p>
                             </div>
                        </div>
                    </div>
                )}

                {selectedReport === 'maintenance' && reportData?.maintenance && (
                    <div className="animate-fade-in">
                        <div className="sg" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '32px' }}>
                            <div className="sc bl gc"><div className="si2"><Wrench /></div><div className="sv num">{reportData.maintenance.total}</div><div className="sl">REQUESTS</div></div>
                            <div className="sc gn gc"><div className="si2"><CheckCircle /></div><div className="sv num">{reportData.maintenance.completed}</div><div className="sl">RESOLVED</div></div>
                            <div className="sc or gc"><div className="si2"><Clock /></div><div className="sv num">{reportData.maintenance.pending}</div><div className="sl">PENDING</div></div>
                            <div className="sc rd gc"><div className="si2"><DollarSign /></div><div className="sv num">{(reportData.maintenance.totalCost/1000).toFixed(1)}K</div><div className="sl">OPEX IMPACT</div></div>
                        </div>
                        <div className="gc gg" style={{ padding: '24px', border: '1px dashed var(--bdr)' }}>
                             <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                 <div className="si2"><Award size={32} className="text-gold" /></div>
                                 <div>
                                     <div style={{ fontWeight: 900, fontSize: '15px' }}>{lang === 'ar' ? 'معدل الإنجاز' : 'Resolution Rate'}: {reportData.maintenance.resolutionRate || 0}%</div>
                                     <div style={{ fontSize: '11px', color: 'var(--txt3)' }}>{reportData.maintenance.completed} {lang === 'ar' ? 'طلب مكتمل من أصل' : 'completed out of'} {reportData.maintenance.total} {lang === 'ar' ? 'طلب صيانة' : 'maintenance requests'}</div>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {selectedReport === 'tenants' && reportData?.tenants && (
                    <div className="animate-fade-in">
                         <div className="sg" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '32px' }}>
                             <div className="sc bl gc"><div className="si2"><Users /></div><div className="sv num">{reportData.tenants.total}</div><div className="sl">TENANT VOL</div></div>
                             <div className="sc gn gc"><div className="si2"><ShieldCheck /></div><div className="sv num">{reportData.tenants.active}</div><div className="sl">VERIFIED ACTIVE</div></div>
                             <div className="sc or gc"><div className="si2"><TrendingUp /></div><div className="sv num">+{reportData.tenants.growth}%</div><div className="sl">VELOCITY</div></div>
                         </div>
                    </div>
                )}

                {selectedReport === 'performance' && reportData?.performance && (
                    <div className="animate-fade-in">
                         <div className="sg" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                             <div className="sc gn gc"><div className="si2"><DollarSign /></div><div className="sv num">{reportData.performance.collectionRate}%</div><div className="sl">COLLECTION EFFICIENCY</div></div>
                             <div className="sc bl gc"><div className="si2"><Target /></div><div className="sv num">{reportData.performance.occupancyRate}%</div><div className="sl">UTILIZATION RATE</div></div>
                         </div>
                    </div>
                )}

                {selectedReport === 'footfall' && reportData?.footfall && (
                   <div className="animate-fade-in">
                        <div className="sg" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className="sc bl gc"><div className="si2"><Activity /></div><div className="sv num">{reportData.footfall.total.toLocaleString()}</div><div className="sl">CUMULATIVE TRAFFIC</div></div>
                            <div className="sc or gc"><div className="si2"><Users /></div><div className="sv num">{reportData.footfall.avgDaily.toLocaleString()}</div><div className="sl">AVG DAILY LOAD</div></div>
                        </div>
                   </div>
                )}
            </div>
        </div>
      </div>

      {showCustomModal && (
        <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
           <div className="modal-content-diamond" style={{ maxWidth:'450px' }}>
               <div className="modal-header-diamond">
                   <h3 className="modal-title-diamond">Custom Report Protocol</h3>
                   <button className="modal-close-diamond" onClick={() => setShowCustomModal(false)}><X/></button>
               </div>
               <div style={{ padding:'20px' }}>
                   <p style={{ fontSize:'11px', color:'var(--txt3)', marginBottom:'20px' }}>Select temporal boundaries for the generated matrix.</p>
                   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'24px' }}>
                       <div><label className="label">Start</label><input type="date" className="input-field" /></div>
                       <div><label className="label">End</label><input type="date" className="input-field" /></div>
                   </div>
                   <button className="btn" style={{ width:'100%' }} onClick={() => setShowCustomModal(false)}>Execute Matrix</button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}

function DoorOpen({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M9 3v18" />
      <path d="M9 12h.01" />
    </svg>
  );
}
