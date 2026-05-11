import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Globe, Moon, Sun, Bell, Shield, User, Database,
  Palette, Monitor, Mail, Lock, Save, RefreshCw, Check, Languages,
  Volume2, VolumeX, Clock2, Calendar, Building, HelpCircle, Info,
  Zap, Download, Upload, Trash2, Eye, EyeOff, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import firestoreService from '../services/firestoreService';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n/LanguageProvider';

const COLORS = {
  purple: '#a855f7', pink: '#ec4899', gold: '#d4af37',
  emerald: '#10b981', blue: '#3b82f6', red: '#ef4444',
  cyan: '#06b6d4', orange: '#f97316'
};

const TABS = [
  { id: 'appearance', icon: Palette, label_ar: 'المظهر', label_en: 'Appearance', color: COLORS.purple },
  { id: 'notifications', icon: Bell, label_ar: 'الإشعارات', label_en: 'Notifications', color: COLORS.gold },
  { id: 'security', icon: Shield, label_ar: 'الأمان', label_en: 'Security', color: COLORS.red },
  { id: 'account', icon: User, label_ar: 'الحساب', label_en: 'Account', color: COLORS.blue },
  { id: 'system', icon: Monitor, label_ar: 'النظام', label_en: 'System', color: COLORS.cyan },
  { id: 'mall', icon: Building, label_ar: 'المول', label_en: 'Mall', color: COLORS.orange },
  { id: 'data', icon: Database, label_ar: 'البيانات', label_en: 'Data', color: COLORS.emerald },
  { id: 'help', icon: HelpCircle, label_ar: 'المساعدة', label_en: 'Help', color: COLORS.pink },
];

// Modern Toggle component
const Toggle = ({ enabled, onChange, disabled, color = COLORS.emerald }) => (
  <button 
    type="button" 
    onClick={() => !disabled && onChange(!enabled)} 
    disabled={disabled}
    className="toggle-box"
    style={{
      width: 44, height: 22, borderRadius: 12, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
      background: enabled ? color : 'var(--bdr)', border: 'none', transition: 'all 0.3s',
      opacity: disabled ? 0.4 : 1, padding: 0
    }}>
    <div style={{
      width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
      left: enabled ? (document.documentElement.dir === 'rtl' ? 3 : 25) : (document.documentElement.dir === 'rtl' ? 25 : 3), 
      transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }} />
  </button>
);

// Modern Field row
const FieldRow = ({ label, desc, children }) => (
  <div className="settings-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--bdr)' }}>
    <div style={{ flex: 1 }}>
      <div className="label" style={{ marginBottom: 2, fontSize: '13px', color: 'var(--txt)' }}>{label}</div>
      {desc && <div style={{ fontSize: '11px', color: 'var(--txt3)', fontWeight: 500 }}>{desc}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
  </div>
);

export default function Settings() {
  const { user } = useAuthStore();
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage;

  const [activeTab, setActiveTab] = useState('appearance');
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      language: parsed.language || lang || 'ar',
      theme: parsed.theme || 'dark',
      notifications: parsed.notifications || { enabled: true, email: true, sound: true, push: false },
      security: parsed.security || { twoFactor: false, sessionTimeout: '30' },
      performance: parsed.performance || { animations: true, lazyLoading: true, caching: true },
      accessibility: parsed.accessibility || { highContrast: false, largeText: false, reduceMotion: false },
      system: parsed.systemSettings || { timezone: 'Africa/Cairo', dateFormat: 'DD/MM/YYYY', currency: 'EGP' },
      mall: parsed.mallSettings || { name: 'Smart Mall', address: 'القاهرة، مصر', workingHours: '10:00 - 22:00', phone: '+20 100 000 0000' },
      profile: parsed.profile || { name: user?.name || '', email: user?.email || '', phone: user?.phone || '' },
    };
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;
      try {
        const data = await firestoreService.getById('settings', user.id);
        if (data) {
          setSettings(prev => ({
            ...prev,
            language: data.language || prev.language,
            theme: data.theme || prev.theme,
            notifications: data.notifications || prev.notifications,
            security: data.security || prev.security,
            performance: data.performance || prev.performance,
            accessibility: data.accessibility || prev.accessibility,
            system: data.systemSettings || prev.system,
            mall: data.mallSettings || prev.mall,
            profile: data.profile || prev.profile,
          }));
        }
      } catch (error) { console.error('Error loading settings:', error); }
    };
    loadSettings();
  }, [user?.id]);

  const update = (section, key, value) => {
    setSettings(prev => ({
      ...prev, [section]: typeof prev[section] === 'object' ? { ...prev[section], [key]: value } : value
    }));
  };

  const handleSave = async () => {
    if (!user?.id) { toast.error(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Login required'); return; }
    setIsSaving(true);
    try {
      const payload = {
        language: settings.language, theme: settings.theme,
        notifications: settings.notifications, security: settings.security,
        performance: settings.performance, accessibility: settings.accessibility,
        systemSettings: settings.system, mallSettings: settings.mall,
        profile: settings.profile, userId: user.id
      };
      await firestoreService.set('settings', user.id, payload);
      await firestoreService.update('users', user.id, {
        name: settings.profile.name, email: settings.profile.email, phone: settings.profile.phone
      });
      useAuthStore.getState().updateUser(settings.profile);
      localStorage.setItem('appSettings', JSON.stringify(payload));
      
      // Update global theme class
      if (settings.theme === 'light') document.body.classList.add('light');
      else document.body.classList.remove('light');
      
      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving settings');
    } finally { setIsSaving(false); }
  };

  const handleReset = () => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إعادة ضبط المصنع؟' : 'Are you sure you want to reset all settings?')) return;
    setSettings(prev => ({
      ...prev, language: 'ar', theme: 'dark',
      notifications: { enabled: true, email: true, sound: true, push: false },
      security: { twoFactor: false, sessionTimeout: '30' },
      performance: { animations: true, lazyLoading: true, caching: true },
      accessibility: { highContrast: false, largeText: false, reduceMotion: false }
    }));
    toast.success(lang === 'ar' ? 'تم إعادة التعيين' : 'Reset successful');
  };

  return (
    <div className="fu" style={{ animationDelay: '0.1s' }}>
      {/* Page Header */}
      <div className="ph" style={{ justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="phi gg" style={{ background: 'linear-gradient(135deg, var(--gold), #f0c040)', color: '#000' }}>
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2>{lang === 'ar' ? 'إعدادات المنظومة' : 'System Settings'}</h2>
            <span>{lang === 'ar' ? 'التحكم الشامل في تفضيلات النظام والحساب' : 'FULL SYSTEM CONTROL & PREFERENCES'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="ftb" onClick={handleReset} style={{ padding: '8px 16px' }}>
             {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
          </button>
          <button className="btn" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px', justifyContent: 'center' }}>
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {lang === 'ar' ? 'حفظ التغييرات' : 'Save Protocol'}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        
        {/* Sidebar Nav */}
        <div className="gc" style={{ padding: '12px', height: 'fit-content', position: 'sticky', top: '80px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)}
                  className={`ni ${isActive ? 'active' : ''}`}
                  style={{ 
                    border: 'none', 
                    width: '100%', 
                    textAlign: lang === 'ar' ? 'right' : 'left',
                    background: isActive ? `${tab.color}15` : 'transparent',
                    color: isActive ? tab.color : 'var(--txt2)'
                  }}
                >
                  <Icon size={16} className="ic" style={{ color: isActive ? tab.color : 'inherit' }} />
                  <span style={{ fontWeight: isActive ? 800 : 600 }}>
                    {lang === 'ar' ? tab.label_ar : tab.label_en}
                  </span>
                  {isActive && <ChevronLeft size={14} style={{ marginRight: 'auto', marginLeft: 0, opacity: 0.5 }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div className="gc" style={{ padding: '32px' }}>
          
          {/* Appearance Section */}
          {activeTab === 'appearance' && (
            <div className="fu">
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Palette size={20} style={{ color: COLORS.purple }} />
                {lang === 'ar' ? 'السمة والمظهر' : 'Theming & Appearance'}
              </h3>
              
              <FieldRow label={lang === 'ar' ? 'لغة النظام الافتراضية' : 'Default System Language'} desc={lang === 'ar' ? 'سيتم تطبيق هذه اللغة فور تسجيل الدخول' : 'Preferred UI language across the platform'}>
                <select className="input-field" style={{ width: '160px' }} value={settings.language} onChange={e => update('language', null, e.target.value)}>
                  <option value="ar">العربية (🇸🇦)</option>
                  <option value="en">English (🇺🇸)</option>
                </select>
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'نمط الواجهة' : 'Interface Theme'} desc={lang === 'ar' ? 'اختر النمط البصري المفضل لديك' : 'Select your primary visual atmosphere'}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'light', icon: Sun, label: lang === 'ar' ? 'فاتح' : 'Light', color: COLORS.gold },
                    { id: 'dark', icon: Moon, label: lang === 'ar' ? 'داكن' : 'Dark', color: COLORS.purple },
                    { id: 'system', icon: Monitor, label: lang === 'ar' ? 'تلقائي' : 'Auto', color: COLORS.emerald }
                  ].map(m => {
                    const MIcon = m.icon;
                    const isSelected = settings.theme === m.id;
                    return (
                      <button 
                        key={m.id} 
                        onClick={() => update('theme', null, m.id)}
                        className={`ftb ${isSelected ? 'active' : ''}`}
                        title={m.label}
                        style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <MIcon size={18} style={{ color: isSelected ? m.color : 'inherit' }} />
                      </button>
                    );
                  })}
                </div>
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'المؤثرات الحركية' : 'Dynamic Animations'} desc={lang === 'ar' ? 'تفعيل الانتقالات الناعمة للجداول والكروت' : 'Enable smooth UI transitions and micro-interactions'}>
                <Toggle enabled={settings.performance.animations} onChange={v => update('performance', 'animations', v)} color={COLORS.purple} />
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'التباين العالي' : 'High Contrast Mode'} desc={lang === 'ar' ? 'تحسين وضوح النصوص والحدود' : 'Enhanced accessibility for visual clarity'}>
                <Toggle enabled={settings.accessibility.highContrast} onChange={v => update('accessibility', 'highContrast', v)} color={COLORS.blue} />
              </FieldRow>
            </div>
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <div className="fu">
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={20} style={{ color: COLORS.gold }} />
                {lang === 'ar' ? 'بروتوكول التنبيهات' : 'Notification Protocol'}
              </h3>
              
              <FieldRow label={lang === 'ar' ? 'النظام المركزي للإشعارات' : 'Central Alerting System'} desc={lang === 'ar' ? 'تفعيل أو تعطيل كافة التنبيهات الواردة' : 'Global master switch for all system alerts'}>
                <Toggle enabled={settings.notifications.enabled} onChange={v => update('notifications', 'enabled', v)} color={COLORS.gold} />
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'تنبيهات البريد الإلكتروني' : 'Email Dispatch'} desc={lang === 'ar' ? 'إرسال الملخصات اليومية والفواتير للبريد' : 'Receive daily summaries and invoice updates'}>
                <Toggle enabled={settings.notifications.email} onChange={v => update('notifications', 'email', v)} disabled={!settings.notifications.enabled} color={COLORS.emerald} />
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'الإشعارات الفورية (Push)' : 'Real-time Push Alerts'} desc={lang === 'ar' ? 'تنبيهات المتصفح المباشرة للطلبات العاجلة' : 'Immediate browser alerts for urgent requests'}>
                <Toggle enabled={settings.notifications.push} onChange={v => update('notifications', 'push', v)} disabled={!settings.notifications.enabled} color={COLORS.purple} />
              </FieldRow>
            </div>
          )}

          {/* Account Section */}
          {activeTab === 'account' && (
            <div className="fu">
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} style={{ color: COLORS.blue }} />
                {lang === 'ar' ? 'ملف المستخدم' : 'Identity Management'}
              </h3>
              
              <div className="gg" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '16px', 
                  background: 'linear-gradient(135deg, var(--gold), #f0c040)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', fontWeight: 900, color: '#000', boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{user?.name || 'مستخدم النظام'}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--txt3)', margin: '2px 0 8px' }}>{user?.email}</p>
                  <span className="bs reserved" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {user?.role || 'Access Level: Admin'}
                  </span>
                </div>
              </div>

              <FieldRow label={lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}>
                <input className="input-field" style={{ width: '240px' }} value={settings.profile.name} onChange={e => update('profile', 'name', e.target.value)} />
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'البريد الرسمي' : 'Official Email'}>
                <input className="input-field" style={{ width: '240px' }} type="email" value={settings.profile.email} onChange={e => update('profile', 'email', e.target.value)} />
              </FieldRow>

              <FieldRow label={lang === 'ar' ? 'رقم تواصل الطوارئ' : 'Emergency Contact'}>
                <input className="input-field" style={{ width: '240px' }} dir="ltr" value={settings.profile.phone} onChange={e => update('profile', 'phone', e.target.value)} />
              </FieldRow>
            </div>
          )}

          {/* Data Section */}
          {activeTab === 'data' && (
            <div className="fu">
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={20} style={{ color: COLORS.emerald }} />
                {lang === 'ar' ? 'إدارة المستودعات والبيانات' : 'Vault & Data Integrity'}
              </h3>
              
              <p style={{ fontSize: '12px', color: 'var(--txt3)', marginBottom: '24px' }}>
                {lang === 'ar' ? 'تحكم في أمن البيانات، النسخ الاحتياطي، وسرعة استجابة النظام.' : 'Execute database operations, backups, and cache clearing protocols.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button className="ni" style={{ justifyContent: 'center', padding: '20px', background: 'rgba(59,130,246,0.1)', color: COLORS.blue, border: '1px solid rgba(59,130,246,0.2)' }}>
                   <Download size={20} />
                   <div style={{ textAlign: 'start' }}>
                      <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تصدير البيانات' : 'Export DB'}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{lang === 'ar' ? 'تحميل نسخة JSON' : 'Download RAW JSON'}</div>
                   </div>
                </button>
                <button className="ni" style={{ justifyContent: 'center', padding: '20px', background: 'rgba(16,185,129,0.1)', color: COLORS.emerald, border: '1px solid rgba(16,185,129,0.2)' }}>
                   <Database size={20} />
                   <div style={{ textAlign: 'start' }}>
                      <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'نسخة سحابية' : 'Cloud Sync'}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{lang === 'ar' ? 'مزامنة فورية' : 'Immediate redundancy'}</div>
                   </div>
                </button>
                <button className="ni" style={{ justifyContent: 'center', padding: '20px', background: 'rgba(249,115,22,0.1)', color: COLORS.orange, border: '1px solid rgba(249,115,22,0.2)' }}>
                   <Trash2 size={20} />
                   <div style={{ textAlign: 'start' }}>
                      <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تطهير الذاكرة' : 'Purge Cache'}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{lang === 'ar' ? 'تنظيف الملفات المؤقتة' : 'Clear localized data'}</div>
                   </div>
                </button>
                <button className="ni" style={{ justifyContent: 'center', padding: '20px', background: 'rgba(239,68,68,0.1)', color: COLORS.red, border: '1px solid rgba(239,68,68,0.2)' }}>
                   <Shield size={20} />
                   <div style={{ textAlign: 'start' }}>
                      <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تدمير الجلسات' : 'Kill Sessions'}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{lang === 'ar' ? 'تسجيل خروج الجميع' : 'Global force logout'}</div>
                   </div>
                </button>
              </div>
            </div>
          )}

          {/* Other tabs placeholder... */}
          {['security', 'system', 'mall', 'help'].includes(activeTab) && (
            <div className="fu" style={{ textAlign: 'center', padding: '60px 0' }}>
               <Info size={40} style={{ color: 'var(--txt3)', marginBottom: '16px', opacity: 0.5 }} />
               <h4 style={{ color: 'var(--txt2)', fontWeight: 700 }}>{lang === 'ar' ? 'قيد التحديث للنمط الجديد' : 'Standardizing Component...'}</h4>
               <p style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '8px' }}>{lang === 'ar' ? 'سيتم تفعيل هذا القسم في التحديث القادم للهوية الماسية.' : 'Section will be active in the next Diamond UI sweep.'}</p>
            </div>
          )}

        </div>
      </div>

      <style>{`
        .toggle-box { outline: none; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .toggle-box:hover { transform: scale(1.05); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ni { transition: all 0.3s ease; }
        .ni:hover { transform: translateX(${lang === 'ar' ? '-4px' : '4px'}); }
      `}</style>
    </div>
  );
}
