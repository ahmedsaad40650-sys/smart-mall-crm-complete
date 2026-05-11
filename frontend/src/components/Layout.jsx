import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from './ThemeProvider';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import NotificationCenter from './NotificationCenter';
import { useNotificationStore } from '../store/notificationStore';
import AIAssistant from './features/AIAssistant';

export default function Layout() {
  const { user } = useAuthStore();
  const { currentLanguage: lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const { notifications, subscribeToNotifications, stopSubscription } = useNotificationStore();

  // Ensure notification subscription is active at Layout level for real-time ticker
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToNotifications(user.id);
      return () => stopSubscription();
    }
  }, [user?.id]);

  // Custom states for Ticker & Notifications to keep UI live
  const [tickerItems, setTickerItems] = useState([
    "🚀 النظام يعمل بكفاءة",
    "💎 تم تفعيل Diamond Pro v3.0"
  ]);

  // Hook into Firestore via useNotificationStore to get actual live events for ticker
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      setTickerItems(notifications.slice(0, 7).map(n => 
        (n.type === 'urgent' ? '🚨 ' : '🔔 ') + (n.title || n.message)
      ));
    } else {
      setTickerItems([
        lang === 'ar' ? "🚀 النظام يعمل بكفاءة" : "🚀 All Systems Operational",
        lang === 'ar' ? "💎 تم تفعيل Diamond Pro v3.0" : "💎 Diamond Pro v3.0 Active"
      ]);
    }
  }, [notifications, lang]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    if (lang === 'ar') {
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
    }
  }, [lang]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  // Handle clicking outside to close panels
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (mobileSidebarOpen && window.innerWidth <= 768 && !e.target.closest('.sb') && !e.target.closest('.mobile-menu-btn')) {
        setMobileSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [mobileSidebarOpen]);

  const navItems = [
    // المنظومة الذكية
    { label: lang === 'ar' ? 'AI Manager' : 'AI Manager', icon: '🧠', path: '/ai-manager', section: lang === 'ar' ? 'المنظومة الذكية' : 'Smart System' },
    { label: lang === 'ar' ? 'المركز الإستراتيجي' : 'Strategic Center', icon: '📊', path: '/dashboard', section: lang === 'ar' ? 'المنظومة الذكية' : 'Smart System' },
    { label: lang === 'ar' ? 'اللوحة المتقدمة' : 'Advanced Dashboard', icon: '💎', path: '/enhanced-dashboard', section: lang === 'ar' ? 'المنظومة الذكية' : 'Smart System' },
    { label: lang === 'ar' ? 'مؤشرات الأداء KPI' : 'KPI Dashboard', icon: '🎯', path: '/kpi', section: lang === 'ar' ? 'المنظومة الذكية' : 'Smart System' },

    // بوابة وخدمات المول
    { label: lang === 'ar' ? 'بوابة المول' : 'Mall Portal', icon: '🌐', path: '/portal', section: lang === 'ar' ? 'بوابة وخدمات المول' : 'Mall Portal & Services' },
    { label: lang === 'ar' ? 'إدارة مول' : 'Mall Management', icon: '🏗️', path: '/mall-management', section: lang === 'ar' ? 'بوابة وخدمات المول' : 'Mall Portal & Services' },

    // الكيانات والأصول
    { label: lang === 'ar' ? 'الوحدات التجارية' : 'Commercial Units', icon: '🏢', path: '/units', section: lang === 'ar' ? 'الكيانات والأصول' : 'Entities & Assets' },
    { label: lang === 'ar' ? 'الوحدات المحظورة' : 'Restricted Units', icon: '🚫', path: '/forbidden-units', section: lang === 'ar' ? 'الكيانات والأصول' : 'Entities & Assets' },
    { label: lang === 'ar' ? 'المستأجرين' : 'Tenants', icon: '👥', path: '/tenants', section: lang === 'ar' ? 'الكيانات والأصول' : 'Entities & Assets' },
    { label: lang === 'ar' ? 'العقود' : 'Contracts', icon: '📝', path: '/contracts', section: lang === 'ar' ? 'الكيانات والأصول' : 'Entities & Assets' },

    // العمليات والصيانة
    { label: lang === 'ar' ? 'طلبات الصيانة' : 'Maintenance Requests', icon: '🔧', path: '/maintenance', section: lang === 'ar' ? 'العمليات والصيانة' : 'Maintenance & Ops' },
    { label: lang === 'ar' ? 'أوامر العمل' : 'Work Orders', icon: '📋', path: '/work-orders', section: lang === 'ar' ? 'العمليات والصيانة' : 'Maintenance & Ops' },
    { label: lang === 'ar' ? 'متابعة الصيانة' : 'Maintenance Tracker', icon: '🛠️', path: '/maintenance-tracker', section: lang === 'ar' ? 'العمليات والصيانة' : 'Maintenance & Ops' },
    { label: lang === 'ar' ? 'المقاولين' : 'Contractors', icon: '👷', path: '/contractors', section: lang === 'ar' ? 'العمليات والصيانة' : 'Maintenance & Ops' },

    // المالية
    { label: lang === 'ar' ? 'الفواتير' : 'Invoices', icon: '💰', path: '/invoices', section: lang === 'ar' ? 'المالية' : 'Financials' },
    { label: lang === 'ar' ? 'المدفوعات' : 'Payments', icon: '💳', path: '/payments', section: lang === 'ar' ? 'المالية' : 'Financials' },

    // الأمن والامتثال
    { label: lang === 'ar' ? 'التصاريح' : 'Permits', icon: '🛡️', path: '/permits', section: lang === 'ar' ? 'الأمن والامتثال' : 'Security & Compliance' },
    { label: lang === 'ar' ? 'المخالفات' : 'Violations', icon: '⚠️', path: '/violations', section: lang === 'ar' ? 'الأمن والامتثال' : 'Security & Compliance' },

    // التقارير والنظام
    { label: lang === 'ar' ? 'التقارير' : 'Reports', icon: '📑', path: '/reports', section: lang === 'ar' ? 'التقارير والنظام' : 'Reports & System' },
    { label: lang === 'ar' ? 'الإشعارات' : 'Notifications', icon: '🔔', path: '/notifications', section: lang === 'ar' ? 'التقارير والنظام' : 'Reports & System' },
    { label: lang === 'ar' ? 'صلاحيات الدخول' : 'Access Control', icon: '🔐', path: '/rbac', section: lang === 'ar' ? 'التقارير والنظام' : 'Reports & System' },
    { label: lang === 'ar' ? 'سجل الحركات' : 'Audit Logs', icon: '🔍', path: '/audit-logs', section: lang === 'ar' ? 'التقارير والنظام' : 'Reports & System' },
    { label: lang === 'ar' ? 'الإعدادات' : 'Settings', icon: '⚙️', path: '/settings', section: lang === 'ar' ? 'التقارير والنظام' : 'Reports & System' },
  ];

  const groupedNav = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth <= 768) setMobileSidebarOpen(false);
  };

  return (
    <div className={`app ${theme === 'light' ? 'light' : ''}`}>
      
      {/* Removed old redundant Notification Panel */}

      {/* Mobile Sidebar Overlay */}
      <div
        className={`sb-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar (.sb) */}
      <aside className={`sb ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sb-logo">
          <div className="li">💎</div>
          <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            SMART MALL<span>Diamond Pro v3.0</span>
          </h1>
        </div>
        
        <nav className="sb-nav">
          {Object.entries(groupedNav).map(([sectionTitle, items], index) => (
            <div className="ns" key={index}>
              <div className="ns-t">{sectionTitle}</div>
              {items.map((item, idx) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <div key={idx} className={`ni ${isActive ? 'active' : ''}`} onClick={() => handleNavClick(item.path)}>
                    <span className="ic">{item.icon}</span>
                    {item.label}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        
        <div style={{ padding: '8px', borderTop: '1px solid var(--bdr)' }}>
          <div className="up">
            <div className="ua">{user?.role?.toLowerCase() === 'tenant' ? '🏪' : '👑'}</div>
            <div className="ui">
              <div className="n">{user?.name || 'Administrator'}</div>
              <div className="r">{user?.role || 'ADMIN'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area (.ma) */}
      <div className={`ma ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header (.hd) */}
        <header className="hd flex justify-between">
          <div className="flex items-center gap-2">
            <button className="mobile-menu-btn hb" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
              ☰
            </button>
            <div className="hs relative hidden sm:flex">
              <span>🔍</span>
              <input placeholder={lang === 'ar' ? "بحث سريع... (Ctrl+K)" : "Quick Search... (Ctrl+K)"} />
            </div>
          </div>
          
          <div className="ha">
            <NotificationCenter />
            <div className="hb" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </div>
            <div className="hb text-[10px] font-bold" onClick={toggleLanguage}>
              {lang === 'ar' ? 'EN' : 'AR'}
            </div>
            <div className="up hidden sm:flex" onClick={() => window.location.href = '/login'}>
              <div className="ua">{user?.role?.toLowerCase() === 'tenant' ? '🏪' : '👑'}</div>
              <div className="ui">
                <div className="n">{user?.name || 'Ahmed Saad'}</div>
                <div className="r text-red-500">{lang === 'ar' ? 'خروج' : 'Logout'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Component (.mc) */}
        <div className="mc" id="mC">
          <Outlet />
        </div>

        {/* Live Ticker (.ltk) */}
        <div className="ltk">
          <div className="ltl">
            <div className="dot"></div>{lang === 'ar' ? 'مباشر' : 'LIVE'}
          </div>
          <div className="ltc">
            <div className="ltt">
              {tickerItems.concat(tickerItems).concat(tickerItems).map((tick, i) => (
                <span key={i} style={{ margin: '0 16px' }}>{tick}</span>
              ))}
            </div>
          </div>
        </div>

      </div>

      <AIAssistant />
    </div>
  );
}
