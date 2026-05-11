import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import React, { lazy, Suspense } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import RBACGuard from './components/RBACGuard'

// Core pages - loaded eagerly (needed immediately)
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

// Wrapper to prevent chunk load errors after deployments
const lazyRetry = (componentImport) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload(true);
      }
      throw error;
    }
  });
};

// All other pages - lazy loaded for code splitting
const Units = lazyRetry(() => import('./pages/Units'))
const Tenants = lazyRetry(() => import('./pages/Tenants'))
const Maintenance = lazyRetry(() => import('./pages/Maintenance'))
const Invoices = lazyRetry(() => import('./pages/Invoices'))
const Payments = lazyRetry(() => import('./pages/Payments'))
const Permits = lazyRetry(() => import('./pages/Permits'))
const Reports = lazyRetry(() => import('./pages/Reports'))
const Settings = lazyRetry(() => import('./pages/Settings'))
const MallPortal = lazyRetry(() => import('./pages/MallPortal'))
const Violations = lazyRetry(() => import('./pages/Violations'))
const Notifications = lazyRetry(() => import('./pages/Notifications'))
const EnhancedDashboard = lazyRetry(() => import('./pages/EnhancedDashboard'))
const RBACManagement = lazyRetry(() => import('./pages/RBACManagement'))
const ForbiddenUnits = lazyRetry(() => import('./pages/ForbiddenUnits'))
const WorkOrders = lazyRetry(() => import('./pages/WorkOrders'))
const Contracts = lazyRetry(() => import('./pages/Contracts'))
const AuditLogs = lazyRetry(() => import('./pages/AuditLogs'))
const MallManagement = lazyRetry(() => import('./pages/MallManagement'))
const TestPage = lazyRetry(() => import('./pages/TestPage'))
const MaintenanceTracker = lazyRetry(() => import('./pages/MaintenanceTracker'))
const ContractorsPage = lazyRetry(() => import('./pages/Contractors'))
const KPIDashboard = lazyRetry(() => import('./pages/KPIDashboard'))
const AIManager = lazyRetry(() => import('./pages/AIManager'))


import DataDebugger from './components/DataDebugger'
import { ToastProvider } from './components/ui/Toast'

// مكون التحميل
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-primary-600 font-semibold animate-pulse">جاري التحميل...</p>
    </div>
  </div>
)

// حماية المسارات
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    // حفظ الصفحة المطلوبة للعودة لها بعد تسجيل الدخول
    const currentPath = window.location.pathname
    if (currentPath !== '/login') {
      sessionStorage.setItem('redirectAfterLogin', currentPath)
    }
    return <Navigate to="/login" replace />
  }

  return children
}

// مكون للتعامل مع 404
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">الصفحة غير موجودة</p>
      <a
        href="/dashboard"
        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
      >
        العودة للوحة التحكم
      </a>
    </div>
  </div>
)

function App() {
  const { getCurrentUser, isAuthenticated, user } = useAuthStore()
  const [initializing, setInitializing] = React.useState(true)

  React.useEffect(() => {


    // التحقق من حالة المستخدم عند تشغيل التطبيق لأول مرة
    const initAuth = async () => {
      try {
        await getCurrentUser()

        // إذا كان المستخدم مسجل دخول وهناك صفحة محفوظة، انتقل لها
        if (isAuthenticated) {
          const redirectPath = sessionStorage.getItem('redirectAfterLogin')
          if (redirectPath && redirectPath !== '/login') {
            sessionStorage.removeItem('redirectAfterLogin')
            window.location.href = redirectPath
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setInitializing(false)
      }
    }

    initAuth()
  }, [getCurrentUser, isAuthenticated])

  if (initializing) {
    return <PageLoader />
  }

  return (
    <ToastProvider>
      <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* المسارات العامة */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />

          {/* المسارات المحمية */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={
              useAuthStore.getState().can('dashboard.view')
                ? <Navigate to="/dashboard" replace />
                : useAuthStore.getState().can('portal.view')
                  ? <Navigate to="/portal" replace />
                  : <Navigate to="/dashboard" replace />
            } />
            <Route path="dashboard" element={
              <RBACGuard action="dashboard.view">
                <Dashboard />
              </RBACGuard>
            } />
            <Route path="enhanced-dashboard" element={
              <RBACGuard action="dashboard.view">
                <EnhancedDashboard />
              </RBACGuard>
            } />
            <Route path="units" element={
              <RBACGuard action="units.view">
                <Units />
              </RBACGuard>
            } />
            <Route path="tenants" element={
              <RBACGuard action="tenants.view">
                <Tenants />
              </RBACGuard>
            } />
            <Route path="maintenance" element={
              <RBACGuard action="maintenance.view">
                <Maintenance />
              </RBACGuard>
            } />
            <Route path="invoices" element={
              <RBACGuard action="invoices.view">
                <Invoices />
              </RBACGuard>
            } />
            <Route path="payments" element={
              <RBACGuard action="payments.view">
                <Payments />
              </RBACGuard>
            } />
            <Route path="contracts" element={
              <RBACGuard action="contracts.view">
                <Contracts />
              </RBACGuard>
            } />
            <Route path="permits" element={
              <RBACGuard action="permits.view">
                <Permits />
              </RBACGuard>
            } />
            <Route path="work-orders" element={
              <RBACGuard action="maintenance.view">
                <WorkOrders />
              </RBACGuard>
            } />
            <Route path="forbidden-units" element={
              <RBACGuard action="units.view">
                <ForbiddenUnits />
              </RBACGuard>
            } />

            <Route path="users" element={<Navigate to="/rbac" replace />} />
            <Route path="rbac" element={
              <RBACGuard action="roles.view" showFallback>
                <RBACManagement />
              </RBACGuard>
            } />
            <Route path="portal" element={
              <RBACGuard action="portal.view">
                <MallPortal />
              </RBACGuard>
            } />
            <Route path="violations" element={
              <RBACGuard action="violations.view">
                <Violations />
              </RBACGuard>
            } />
            <Route path="notifications" element={
              <RBACGuard action="notifications.view">
                <Notifications />
              </RBACGuard>
            } />
            <Route path="reports" element={
              <RBACGuard action="reports.view" showFallback>
                <Reports />
              </RBACGuard>
            } />
            <Route path="audit-logs" element={<RBACGuard action="logs.view"><AuditLogs /></RBACGuard>} />
            <Route path="mall-management" element={<RBACGuard action="settings.view"><MallManagement /></RBACGuard>} />
            <Route path="contractors" element={<RBACGuard action="contractors.view"><ContractorsPage /></RBACGuard>} />
            <Route path="maintenance-tracker" element={<RBACGuard action="maintenance_tracker.view"><MaintenanceTracker /></RBACGuard>} />
            <Route path="kpi" element={<RBACGuard action="kpi.view"><KPIDashboard /></RBACGuard>} />
            <Route path="ai-manager" element={<AIManager />} />
            <Route path="settings" element={<Settings />} />
            <Route path="test" element={<TestPage />} />
          </Route>

          {/* صفحة 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <DataDebugger />
      </Router>
    </ToastProvider>
  )
}

export default App
