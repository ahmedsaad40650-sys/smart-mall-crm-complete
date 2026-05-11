import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, DollarSign, Activity, TrendingUp, 
  MapPin, Clock, Calendar, Shield, Zap, ChevronRight, 
  RefreshCw, Layers, Layout, Grid, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Package, Wrench, FileText,
  AlertCircle, CheckCircle2, MoreVertical, Star, Crown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  Cell, PieChart as RePieChart, Pie
} from 'recharts';
import { useLanguage } from '../i18n/LanguageProvider';
import firestoreService from '../services/firestoreService';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { currentLanguage: lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    occupancy: 0,
    unitCount: 0,
    revenue: 0,
    maintRequests: 0,
    visitorTelemetry: [],
    recentActivity: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [units, maintenance, invoices, occupancy, payments] = await Promise.all([
        firestoreService.getAll('units'),
        firestoreService.getAll('maintenance_requests'),
        firestoreService.getAll('invoices'),
        firestoreService.getAll('occupancy'),
        firestoreService.getAll('payments')
      ]);

      const rented = units.filter(u => u.status === 'rented' || u.status === 'مؤجرة').length;
      const totalRevenue = invoices.filter(i => i.status === 'paid' || i.status === 'مدفوعة')
                                   .reduce((s, i) => s + (Number(i.amount || i.totalAmount) || 0), 0);

      const telemetry = occupancy.slice(-7).map(o => ({
          date: o.date,
          visitors: Object.values(o.input?.gates || {}).reduce((s,v) => s + (parseInt(v)||0), 0),
          load: Math.round(Object.values(o.input?.restaurants || {}).reduce((s,v) => s + (parseInt(v)||0), 0) / (Object.keys(o.input?.restaurants || {}).length || 1))
      }));

      // Calculate real budget utilization from payments vs invoices
      const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.amount || i.totalAmount) || 0), 0);
      const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const budgetUtilization = totalInvoiced > 0 ? Math.min(Math.round((totalPaid / totalInvoiced) * 100), 100) : 0;

      // Calculate real ticket resolution rate
      const totalMaint = maintenance.length;
      const completedMaint = maintenance.filter(m => m.status === 'completed' || m.status === 'مكتمل').length;
      const ticketResolution = totalMaint > 0 ? Math.round((completedMaint / totalMaint) * 100) : 0;

      // Build real recent activities with proper time calculations
      const getTimeStr = (dateStr) => {
        if (!dateStr) return '';
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
        if (diff < 60) return `${diff}m`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h`;
        return `${Math.floor(diff / 1440)}d`;
      };

      const recentActivity = [
          ...invoices.filter(i => i.status === 'paid').slice(0, 3).map(i => ({
            type: 'finance',
            title: i.tenantName || (lang === 'ar' ? 'مستأجر' : 'Tenant'),
            desc: lang === 'ar' ? `تأكيد سداد ${(Number(i.amount) || 0).toLocaleString()} ج.م` : `Payment of ${(Number(i.amount) || 0).toLocaleString()} confirmed.`,
            time: getTimeStr(i.updated_at || i.created_at)
          })),
          ...maintenance.slice(0, 3).map(m => ({
            type: 'maint',
            title: m.title || (lang === 'ar' ? 'طلب صيانة' : 'Maintenance'),
            desc: lang === 'ar' ? `حالة الطلب: ${m.status}` : `Request status: ${m.status}`,
            time: getTimeStr(m.created_at)
          }))
      ];

      setData({
        occupancy: units.length > 0 ? Math.round((rented / units.length) * 100) : 0,
        unitCount: units.length,
        revenue: totalRevenue,
        maintRequests: maintenance.filter(m => m.status !== 'completed' && m.status !== 'مكتمل').length,
        visitorTelemetry: telemetry,
        budgetUtilization,
        ticketResolution,
        recentActivity
      });

    } catch (error) {
       console.error('Dashboard data error:', error);
       toast.error(lang === 'ar' ? 'فشل تحميل بيانات لوحة التحكم' : 'Failed to load dashboard data');
    } finally { setLoading(false) }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>

  return (
    <div className="fu">
      {/* Premium Header */}
      <div className="ph" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #f0c040 100%)', color: '#000', width: '64px', height: '64px' }}>
            <Crown size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '28px' }}>{lang === 'ar' ? 'المركز الإستراتيجي للمول' : 'STRATEGIC MALL OPERATIONS'}</h2>
            <span style={{ fontSize: '14px', letterSpacing: '2px' }}>{lang === 'ar' ? 'نظام القيادة الموحد — الإصدار الماسي 3.0' : 'UNIFIED COMMAND CENTER — DIAMOND V3.0'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <div className="si2" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '10px', padding: '6px 12px', borderRadius: '20px', fontWeight: 900 }}>{lang === 'ar' ? 'الأنظمة متصلة' : 'SYSTEMS ONLINE'}</div>
             <button className="ni" onClick={fetchDashboardData}><RefreshCw size={18}/></button>
        </div>
      </div>

      {/* Stats Cluster */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
           <div className="sc bl gc">
                <div className="si2"><Users /></div>
                <div className="sv num">{data.visitorTelemetry.length > 0 ? ((data.visitorTelemetry[data.visitorTelemetry.length-1]?.visitors || 0) / 1000).toFixed(1) + 'K' : '0'}</div>
                <div className="sl">{lang === 'ar' ? 'الزوار النشطين' : 'DAILY PATRONS'}</div>
                <div style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'4px', background:'var(--bl)', opacity:0.3 }} />
           </div>
           <div className="sc gn gc">
                <div className="si2"><DollarSign /></div>
                <div className="sv num">{(data.revenue/1000).toFixed(0)}K</div>
                <div className="sl">{lang === 'ar' ? 'إجمالي الدخل (جنيه)' : 'GROSS REVENUE (EGP)'}</div>
                <div style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'4px', background:'var(--gn)', opacity:0.3 }} />
           </div>
           <div className="sc pu gc">
                <div className="si2"><Building2 /></div>
                <div className="sv num">{data.occupancy}%</div>
                <div className="sl">{lang === 'ar' ? 'نسبة الإشغال المباشرة' : 'CAPACITY UTILIZATION'}</div>
                <div style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'4px', background:'var(--pu)', opacity:0.3 }} />
           </div>
           <div className="sc or gc">
                <div className="si2"><Activity /></div>
                <div className="sv num">{data.maintRequests}</div>
                <div className="sl">{lang === 'ar' ? 'الأعطال المفتوحة' : 'OPEN TICKETS'}</div>
                <div style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'4px', background:'var(--or)', opacity:0.3 }} />
           </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '32px' }}>
           {/* Flux Visualization */}
           <div className="gc gg" style={{ padding: '32px', borderRadius: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                     <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 900 }}>{lang === 'ar' ? 'تدفق بيانات الإشغال' : 'LOAD TELEMETRY FLUX'}</h3>
                          <div className="sl">{lang === 'ar' ? 'مؤشرات الأيام السبعة الماضية' : '7-DAY ANALYTICAL OVERLAY'}</div>
                     </div>
                     <div className="ft">
                          <span className="bs active" style={{ fontSize: '8px' }}>{lang === 'ar' ? 'الزوار' : 'VISITORS'}</span>
                          <span className="bs pu" style={{ fontSize: '8px' }}>{lang === 'ar' ? 'نسبة الكثافة %' : 'LOAD %'}</span>
                     </div>
                </div>
                <div style={{ height: '350px' }}>
                     {data.visitorTelemetry.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={data.visitorTelemetry}>
                             <defs>
                                 <linearGradient id="visCol" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.4}/>
                                     <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                                 </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bdr)" />
                             <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                             <YAxis fontSize={10} axisLine={false} tickLine={false} />
                             <Tooltip contentStyle={{ background: 'var(--bg)', border:'1px solid var(--bdr)', borderRadius:'12px' }} />
                             <Area type="monotone" dataKey="visitors" stroke="var(--gold)" strokeWidth={3} fillOpacity={1} fill="url(#visCol)" />
                             <Area type="monotone" dataKey="load" stroke="var(--pu)" strokeWidth={2} fill="transparent" />
                         </AreaChart>
                     </ResponsiveContainer>
                     ) : (
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--txt3)', fontSize: '13px', fontWeight: 700 }}>
                         {lang === 'ar' ? 'No occupancy data recorded' : 'No occupancy data recorded yet'}
                       </div>
                     )}
                </div>
           </div>

           {/* Core Health */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div className="gc gg" style={{ padding: '32px', borderRadius: '32px', flex: 1 }}>
                     <h3 style={{ fontSize: '16px', fontWeight: 900, marginBottom: '24px' }}>{lang === 'ar' ? 'سلامة ومؤشرات الأصول' : 'ASSET HEALTH'}</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                             <div className="si2" style={{ background:'var(--bl)10', color:'var(--bl)' }}><Layout size={14}/></div>
                             <div style={{ flex:1 }}><div style={{ fontSize:'11px', fontWeight:800 }}>{lang === 'ar' ? 'معدل تأجير الوحدات' : 'UNIT LEASE RATE'}</div><div style={{ height:'6px', background:'var(--bg2)', borderRadius:'3px', marginTop:'6px' }}><div style={{ width:`${data.occupancy}%`, height:'100%', background:'var(--bl)' }} /></div></div>
                             <div className="num" style={{ fontSize:'12px' }}>{data.occupancy}%</div>
                          </div>
                          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                             <div className="si2" style={{ background:'var(--gn)10', color:'var(--gn)' }}><DollarSign size={14}/></div>
                             <div style={{ flex:1 }}><div style={{ fontSize:'11px', fontWeight:800 }}>{lang === 'ar' ? 'نسبة التحصيل' : 'COLLECTION RATE'}</div><div style={{ height:'6px', background:'var(--bg2)', borderRadius:'3px', marginTop:'6px' }}><div style={{ width:`${data.budgetUtilization || 0}%`, height:'100%', background:'var(--gn)' }} /></div></div>
                             <div className="num" style={{ fontSize:'12px' }}>{data.budgetUtilization || 0}%</div>
                          </div>
                          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                             <div className="si2" style={{ background:'var(--or)10', color:'var(--or)' }}><Wrench size={14}/></div>
                             <div style={{ flex:1 }}><div style={{ fontSize:'11px', fontWeight:800 }}>{lang === 'ar' ? 'كفاءة حل التذاكر' : 'TICKET RESOLUTION'}</div><div style={{ height:'6px', background:'var(--bg2)', borderRadius:'3px', marginTop:'6px' }}><div style={{ width:`${data.ticketResolution || 0}%`, height:'100%', background:'var(--or)' }} /></div></div>
                             <div className="num" style={{ fontSize:'12px' }}>{data.ticketResolution || 0}%</div>
                          </div>
                     </div>
                </div>
                
                <div className="gc gg" style={{ padding: '32px', borderRadius: '32px', background: 'linear-gradient(135deg, var(--gc), rgba(212,175,55,0.05))' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--gold)', letterSpacing:'1px', marginBottom: '16px' }}>{lang === 'ar' ? 'ملخص سريع' : 'QUICK SUMMARY'}</h3>
                      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                           <div className="phi gg" style={{ width:'48px', height:'48px' }}><Star size={20}/></div>
                           <div>
                                <div style={{ fontSize:'14px', fontWeight:900 }}>{lang === 'ar' ? `${data.unitCount} وحدة مسجلة` : `${data.unitCount} Registered Units`}</div>
                                <div className="sl">{lang === 'ar' ? `${data.maintRequests} تذكرة صيانة مفتوحة` : `${data.maintRequests} Open Maintenance Tickets`}</div>
                           </div>
                      </div>
                 </div>
           </div>
      </div>

      {/* Activity Feed */}
      <div className="gc gg" style={{ padding: '32px', borderRadius: '32px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'24px' }}>
                 <h3 style={{ fontSize:'15px', fontWeight:900 }}>{lang === 'ar' ? 'سجل النشاط اللحظي' : 'REAL-TIME ACTIVITY FEED'}</h3>
                 <div style={{ display:'flex', gap:'8px' }}>
                     <button className="ftb">{lang === 'ar' ? 'الكل' : 'ALL'}</button>
                     <button className="ftb">{lang === 'ar' ? 'النظام' : 'SYSTEM'}</button>
                     <button className="ftb">{lang === 'ar' ? 'الأفراد' : 'HUMAN'}</button>
                 </div>
            </div>
           <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'16px' }}>
                 {data.recentActivity.map((item, i) => (
                    <div key={i} className="gg" style={{ padding:'16px', borderRadius:'16px', border:'1px solid var(--bdr)', display:'flex', gap:'16px', alignItems:'center' }}>
                         <div className="si2" style={{ padding:'8px', background: item.type==='finance' ? 'var(--gn)10' : item.type==='alert' ? 'var(--pu)10' : 'var(--or)10', color: item.type==='finance' ? 'var(--gn)' : item.type==='alert' ? 'var(--pu)' : 'var(--or)' }}>
                             {item.type==='finance' ? <DollarSign size={16}/> : item.type==='alert' ? <Shield size={16}/> : <Wrench size={16}/>}
                         </div>
                         <div style={{ flex: 1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                   <div style={{ fontSize:'13px', fontWeight:800 }}>{item.title}</div>
                                    <div style={{ fontSize:'9px', color:'var(--txt3)', fontWeight:900 }}>{item.time} {lang === 'ar' ? 'مضت' : 'AGO'}</div>
                              </div>
                              <div style={{ fontSize:'11px', color:'var(--txt3)' }}>{item.desc}</div>
                         </div>
                    </div>
                ))}
           </div>
      </div>
    </div>
  );
}
