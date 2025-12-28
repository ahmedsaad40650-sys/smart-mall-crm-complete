# 📚 Smart Mall CRM - API Documentation

## نظرة عامة

توثيق شامل لجميع نقاط API المتاحة في نظام Smart Mall CRM.

**Base URL**: `http://localhost:5000/api`

---

## 🔐 المصادقة (Authentication)

### تسجيل الدخول

```http
POST /auth/login
```

**Body**:
```json
{
  "email": "admin@smartmall.com",
  "password": "admin123"
}
```

**Response** (200):
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "user_123",
    "email": "admin@smartmall.com",
    "name": "مدير النظام",
    "role": "admin"
  }
}
```

### تسجيل مستخدم جديد

```http
POST /auth/register
```

**Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "اسم المستخدم",
  "phone": "+966500000000",
  "role": "user"
}
```

### الحصول على المستخدم الحالي

```http
GET /auth/me
Authorization: Bearer {token}
```

---

## 🏢 الوحدات التجارية (Units)

### الحصول على جميع الوحدات

```http
GET /units
GET /units?status=available
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "units": [
    {
      "id": "unit_123",
      "unit_number": "A-101",
      "floor": "1",
      "area": 150,
      "rental_price": 5000,
      "type": "retail",
      "status": "available",
      "description": "وحدة تجارية مميزة"
    }
  ],
  "total": 1
}
```

### إنشاء وحدة جديدة

```http
POST /units
Authorization: Bearer {token}
```

**Body**:
```json
{
  "unit_number": "A-101",
  "floor": "1",
  "area": 150,
  "rental_price": 5000,
  "type": "retail",
  "status": "available",
  "description": "وحدة تجارية مميزة",
  "amenities": ["تكييف", "إضاءة"]
}
```

### تحديث وحدة

```http
PUT /units/{unit_id}
Authorization: Bearer {token}
```

**Body**:
```json
{
  "status": "rented",
  "rental_price": 5500
}
```

### حذف وحدة

```http
DELETE /units/{unit_id}
Authorization: Bearer {token}
```

---

## 👥 المستأجرين (Tenants)

### الحصول على جميع المستأجرين

```http
GET /tenants
GET /tenants?status=active
Authorization: Bearer {token}
```

### إضافة مستأجر جديد

```http
POST /tenants
Authorization: Bearer {token}
```

**Body**:
```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "+966500000000",
  "business_name": "متجر الإلكترونيات",
  "business_type": "retail",
  "tax_id": "1234567890",
  "address": "الرياض، السعودية"
}
```

---

## 📄 العقود (Contracts)

### الحصول على جميع العقود

```http
GET /contracts
GET /contracts?status=active
GET /contracts?tenant_id={tenant_id}
Authorization: Bearer {token}
```

### إنشاء عقد جديد

```http
POST /contracts
Authorization: Bearer {token}
```

**Body**:
```json
{
  "tenant_id": "tenant_123",
  "unit_id": "unit_123",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "monthly_rent": 5000,
  "deposit": 10000,
  "payment_day": 1,
  "terms": "شروط العقد...",
  "notes": "ملاحظات..."
}
```

---

## 🔧 طلبات الصيانة (Maintenance)

### الحصول على جميع طلبات الصيانة

```http
GET /maintenance
GET /maintenance?status=pending
GET /maintenance?priority=high
Authorization: Bearer {token}
```

### إنشاء طلب صيانة جديد

```http
POST /maintenance
Authorization: Bearer {token}
```

**Body**:
```json
{
  "unit_id": "unit_123",
  "title": "إصلاح التكييف",
  "description": "تعطل التكييف في الوحدة",
  "category": "hvac",
  "priority": "high"
}
```

### تحديث طلب صيانة

```http
PUT /maintenance/{request_id}
Authorization: Bearer {token}
```

**Body**:
```json
{
  "status": "in_progress",
  "assigned_to": "technician_123",
  "notes": "جاري العمل على الإصلاح"
}
```

---

## 📑 الفواتير (Invoices)

### الحصول على جميع الفواتير

```http
GET /invoices
GET /invoices?status=pending
GET /invoices?tenant_id={tenant_id}
Authorization: Bearer {token}
```

### إنشاء فاتورة جديدة

```http
POST /invoices
Authorization: Bearer {token}
```

**Body**:
```json
{
  "tenant_id": "tenant_123",
  "contract_id": "contract_123",
  "amount": 5000,
  "tax_amount": 750,
  "due_date": "2024-02-01",
  "type": "rent",
  "description": "إيجار شهر يناير 2024",
  "items": [
    {
      "description": "إيجار",
      "amount": 5000
    }
  ]
}
```

---

## 💰 المدفوعات (Payments)

### الحصول على جميع المدفوعات

```http
GET /payments
GET /payments?tenant_id={tenant_id}
GET /payments?invoice_id={invoice_id}
Authorization: Bearer {token}
```

### تسجيل دفعة جديدة

```http
POST /payments
Authorization: Bearer {token}
```

**Body**:
```json
{
  "invoice_id": "invoice_123",
  "tenant_id": "tenant_123",
  "amount": 5750,
  "payment_method": "bank_transfer",
  "payment_date": "2024-01-15",
  "transaction_id": "TXN123456",
  "notes": "تم الدفع كاملاً"
}
```

---

## 📋 التصاريح (Permits)

### الحصول على جميع التصاريح

```http
GET /permits
GET /permits?status=pending
Authorization: Bearer {token}
```

### إنشاء تصريح جديد

```http
POST /permits
Authorization: Bearer {token}
```

**Body**:
```json
{
  "tenant_id": "tenant_123",
  "permit_type": "renovation",
  "title": "تجديد المتجر",
  "description": "طلب تصريح لتجديد واجهة المتجر",
  "start_date": "2024-02-01",
  "end_date": "2024-02-15"
}
```

### تحديث حالة تصريح

```http
PUT /permits/{permit_id}
Authorization: Bearer {token}
```

**Body**:
```json
{
  "status": "approved",
  "review_notes": "تمت الموافقة على التصريح"
}
```

---

## 📊 لوحة التحكم والتقارير (Dashboard & Reports)

### إحصائيات لوحة التحكم

```http
GET /dashboard/stats
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "total_units": 50,
  "available_units": 10,
  "rented_units": 40,
  "total_tenants": 38,
  "active_tenants": 36,
  "total_contracts": 40,
  "active_contracts": 38,
  "pending_maintenance": 5,
  "total_invoices": 120,
  "pending_invoices": 8,
  "paid_invoices": 112,
  "total_revenue": 600000,
  "pending_payments": 40000
}
```

### تقرير معدل الإشغال

```http
GET /reports/occupancy
Authorization: Bearer {token}
```

### تقرير الإيرادات

```http
GET /reports/revenue?period=monthly
Authorization: Bearer {token}
```

---

## ❌ رموز الأخطاء (Error Codes)

| الكود | الوصف |
|------|-------|
| 200 | نجحت العملية |
| 201 | تم الإنشاء بنجاح |
| 400 | طلب غير صحيح |
| 401 | غير مصرح |
| 403 | ممنوع |
| 404 | غير موجود |
| 500 | خطأ في الخادم |

### مثال على رسالة خطأ

```json
{
  "error": "البريد الإلكتروني مسجل مسبقاً"
}
```

---

## 🔒 الأمان

### Headers المطلوبة

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

### انتهاء صلاحية التوكن

- مدة صلاحية التوكن: 24 ساعة
- يجب تجديد التوكن بتسجيل الدخول مرة أخرى

---

## 📝 ملاحظات

- جميع التواريخ بصيغة ISO 8601
- جميع الأسعار بالريال السعودي
- دعم كامل للغة العربية
- جميع الاستجابات بصيغة JSON

---

**آخر تحديث**: 2024-01-01
