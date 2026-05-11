import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, db } from '../firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { rbacService } from '../services/rbacService'
import { permissionService } from '../services/permissionService'
import { eventBus } from '../utils/eventBus'

// Role groups for easy reference (can remain for quick lookups if needed elsewhere)
export const ROLE_GROUPS = {
  managers: ['ceo', 'mall_director', 'operations_sector_manager', 'security_director', 'safety_director', 'maintenance_director'],
  admin: ['admin'],
  operations: ['operations'],
  collections: ['collections'],
  marketing: ['marketing'],
  security: ['security_supervisor', 'security_director'],
  safety: ['safety_supervisor', 'safety_director'],
  engineering: ['maintenance_director', 'maintenance_tech'],
  rdd: ['ceo', 'mall_director'],
  permitApprovers: ['ceo', 'mall_director', 'operations_sector_manager', 'security_director', 'safety_director', 'maintenance_director', 'marketing', 'security_supervisor', 'safety_supervisor']
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      permissions: [],

      login: async (email, password) => {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (!userDoc.exists()) throw new Error('بيانات المستخدم غير موجودة في قاعدة البيانات')

          const userData = { id: firebaseUser.uid, ...userDoc.data() }

          // Use RBAC Service to get permissions (case-insensitive & trimmed)
          const roles = await rbacService.getRoles();
          const roleKey = userData.role?.toLowerCase()?.trim();
          const hasRole = roles[roleKey]

          const rolePermissions = hasRole ? hasRole.permissions : []
          const directPermissions = userData.permissions || []
          const combinedPermissions = Array.from(new Set([...rolePermissions, ...directPermissions]))

          const finalPermissions = combinedPermissions;

          const enrichedUser = { ...userData, permissions: finalPermissions };

          set({
            user: enrichedUser,
            isAuthenticated: true,
            permissions: finalPermissions
          })

          permissionService.clearCache()
          rbacService.setCurrentUser(enrichedUser)
          eventBus.emit('user:login', enrichedUser)

          return { success: true, user: enrichedUser }
        } catch (error) {
          console.error('Login technical error:', error)
          let errorMessage = 'حدث خطأ غير متوقع في نظام الدخول'
          
          // Map Firebase Auth Errors
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور'
          } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من جودة الإنترنت لديك'
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'تم حظر الدخول مؤقتاً لكثرة المحاولات الخاطئة. حاول لاحقاً'
          } else if (error.message) {
            // Use custom thrown errors (like "بيانات المستخدم غير موجودة")
            errorMessage = error.message
          }

          return { success: false, error: errorMessage }
        }
      },

      register: async (email, password, userData) => {
        try {
          if (!userData.role) throw new Error('يرجى تحديد الدور الوظيفي للمستخدم')
          if (!userData.name) throw new Error('يرجى إدخال الاسم الكامل')

          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user

          const profileData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name,
            phone: userData.phone || '',
            role: userData.role,
            unit_id: userData.unit_id || null,
            unit_number: userData.unit_number || null,
            departmentId: userData.departmentId || null,
            status: 'active',
            created_at: new Date().toISOString(),
            permissions: userData.permissions || []
          }

          await setDoc(doc(db, 'users', firebaseUser.uid), profileData)

          return { success: true, user: profileData }
        } catch (error) {
          console.error('Registration error:', error)
          let message = 'حدث خطأ في إنشاء الحساب'
          const errStr = error?.code || error?.message || ''
          
          if (errStr.includes('email-already-in-use')) {
            message = 'هذا البريد الإلكتروني مسجل مسبقاً في النظام'
          } else if (errStr.includes('weak-password')) {
            message = 'كلمة المرور ضعيفة جداً (يجب أن لا تقل عن 6 أحرف)'
          } else if (errStr.includes('invalid-email')) {
            message = 'صيغة البريد الإلكتروني غير صحيحة'
          } else if (errStr.includes('missing or insufficient permissions') || errStr.toLowerCase().includes('permission-denied')) {
            message = 'تم إنشاء الحساب، ولكن تم رفض حفظ البيانات في Firestore بسبب قوانين الحماية (Security Rules). يرجى التأكد من لوحة تحكم Firebase'
          } else if (error.message) {
            message = error.message
          }

          return { success: false, error: message }
        }
      },

      resetPassword: async (email) => {
        try {
          const q = query(collection(db, 'users'), where('email', '==', email))
          const querySnapshot = await getDocs(q)
          
          if (querySnapshot.empty) {
            return { success: false, error: 'البريد الإلكتروني غير مسجل في النظام' }
          }

          await sendPasswordResetEmail(auth, email)
          return { success: true }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      logout: async () => {
        try {
          await signOut(auth)
        } catch (error) {
          console.error('Logout error:', error)
        }

        const oldUser = get().user
        localStorage.removeItem('smartmall_remember_email')
        permissionService.clearCache()
        set({
          user: null,
          isAuthenticated: false,
          permissions: []
        })

        eventBus.emit('user:logout', oldUser)
      },

      getCurrentUser: async () => {
        return new Promise((resolve) => {
          onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
              set({ user: null, isAuthenticated: false, permissions: [] })
              return resolve({ success: false })
            }

            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (!userDoc.exists()) {
              set({ user: null, isAuthenticated: false, permissions: [] })
              return resolve({ success: false })
            }

            const userData = { id: firebaseUser.uid, ...userDoc.data() }

            const roles = await rbacService.getRoles();
            const roleKey = userData.role?.toLowerCase()?.trim();
            const hasRole = roles[roleKey]

            const rolePermissions = hasRole ? hasRole.permissions : []
            const directPermissions = userData.permissions || []
            const combinedPermissions = Array.from(new Set([...rolePermissions, ...directPermissions]))

          const finalPermissionsReload = combinedPermissions;

          const enrichedUser = { ...userData, permissions: finalPermissionsReload };


          set({
            user: enrichedUser,
            isAuthenticated: true,
            permissions: finalPermissionsReload,
            isLoading: false
          })

            permissionService.clearCache();
            rbacService.setCurrentUser(enrichedUser)
            eventBus.emit('user:login', enrichedUser)

            resolve({ success: true })
          })
        })
      },

      getUserPermissions: () => {
        const { user, permissions } = get()
        if (!user) return []

        // If user has wildcard, return all possible perms (optional, but consistent with snippet)
        if (user.permissions?.includes('*') || user.role === 'ceo' || user.role === 'admin') {
          return permissions // In this system, permissions are already enriched in login/getCurrentUser
        }

        return permissions || []
      },

      can: (permission) => {
        const { user } = get()
        if (!user) return false
        if (user.status === 'inactive' || user.status === 'معطل') return false

        // Specific email override for super-admin functionality
        if (user.email === 'adminsystem@smartmall.com') return true

        // Wildcard check
        if (user.permissions?.includes('*')) return true

        // Role-based wildcard check
        const role = user.role?.toLowerCase()
        if (role === 'ceo' || role === 'admin' || role === 'system_admin') {
          return true
        }

        // Direct permission check
        return Array.isArray(user.permissions) && user.permissions.includes(permission)
      },

      canAny: (permissionsArray) => {
        const { can } = get()
        return permissionsArray.some(p => can(p))
      },

      canAll: (permissionsArray) => {
        const { can } = get()
        return permissionsArray.every(p => can(p))
      },

      hasPermission: (permission) => get().can(permission), // Keep for backward compatibility

      getUserDisplayName: () => {
        const { user } = get()
        return user?.name || user?.email || 'مستخدم'
      },

      getRoleLabel: () => {
        const { user } = get()
        // We'll import rbacService dynamically or assume it's available via state if needed
        return user?.role || 'مستخدم'
      },
      
      updateUser: (newData) => {
        const { user } = get()
        set({ user: { ...user, ...newData } })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions
      })
    }
  )
)
