# 🏢 Smart Mall CRM Park St.

<div align="center">

![Smart Mall CRM](https://img.shields.io/badge/Smart%20Mall-CRM-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

**نظام إدارة المولات الذكية الاحترافي والمتكامل**

[الميزات](#-الميزات) • [التثبيت](#-التثبيت) • [الاستخدام](#-الاستخدام) • [الوثائق](#-الوثائق)

</div>

---

## 📋 نظرة عامة

**Smart Mall CRM Park St.** هو نظام إدارة متكامل واحترافي للمولات التجارية يوفر حلولاً شاملة لإدارة جميع جوانب المول من وحدات تجارية، مستأجرين، عقود، صيانة، فواتير، وتقارير مفصلة.

### 🎯 لماذا Smart Mall CRM؟

- ✅ **واجهة عربية كاملة** مع دعم RTL
- ✅ **نظام آمن ومشفر** مع JWT Authentication
- ✅ **تصميم احترافي متجاوب** يعمل على جميع الأجهزة
- ✅ **قاعدة بيانات قوية** MongoDB
- ✅ **سهولة النشر** مع Docker
- ✅ **لوحة تحكم تفاعلية** مع رسوم بيانية

---

## 🚀 الميزات الرئيسية

### 📊 إدارة شاملة

| الميزة | الوصف |
|--------|-------|
| 🏢 **الوحدات التجارية** | إدارة كاملة للوحدات مع تتبع الحالة والمساحات والأسعار |
| 👥 **المستأجرين** | قاعدة بيانات متكاملة للمستأجرين مع جميع التفاصيل |
| 📄 **العقود** | إنشاء وإدارة عقود الإيجار بشكل احترافي |
| 🔧 **الصيانة** | نظام طلبات الصيانة مع تتبع الأولويات والحالات |
| 📑 **الفواتير** | إصدار وتتبع الفواتير بشكل تلقائي |
| 💰 **المدفوعات** | تسجيل المدفوعات وتتبع المستحقات |
| 📋 **التصاريح** | إدارة التصاريح والموافقات الرسمية |
| 📈 **التقارير** | تقارير مفصلة وإحصائيات مرئية |

### 🔒 الأمان

- 🔐 مصادقة JWT متقدمة
- 🛡️ تشفير كلمات المرور
- 🚫 حماية CSRF
- ⏱️ Rate Limiting
- 📝 تسجيل الأحداث الأمنية

### 🎨 التصميم

- 🌙 تصميم عصري مع Tailwind CSS
- 📱 متجاوب بالكامل (Mobile First)
- 🌐 دعم كامل للغة العربية
- ⚡ أداء سريع وسلس
- 🎭 رسوم بيانية تفاعلية

---

## 🏗️ البنية التقنية

### Backend
- **Framework**: Flask 2.3.3
- **Database**: MongoDB 7.0
- **Authentication**: JWT
- **API**: RESTful API

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Charts**: Recharts
- **State**: Zustand

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **Process Manager**: Gunicorn

---

## 📦 التثبيت

### المتطلبات

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM
- 10GB مساحة تخزين

### التثبيت السريع

```bash
# 1. استنساخ المشروع
git clone https://github.com/your-repo/smart-mall-crm.git
cd smart-mall-crm

# 2. تشغيل سكريبت الإعداد التلقائي
./scripts/setup.sh
```

### التثبيت اليدوي

```bash
# 1. إنشاء ملف البيئة
cp backend/.env.example backend/.env

# 2. بناء وتشغيل الحاويات
cd docker
docker-compose build
docker-compose up -d

# 3. التحقق من الحالة
docker-compose ps
```

---

## 🎯 الاستخدام

### الوصول للنظام

بعد التشغيل، يمكنك الوصول للنظام عبر:

- **الواجهة الأمامية**: http://localhost:80
- **API الخلفية**: http://localhost:5000
- **قاعدة البيانات**: mongodb://localhost:27017

### بيانات الدخول الافتراضية

```
البريد الإلكتروني: admin@smartmall.com
كلمة المرور: admin123
```

> ⚠️ **تحذير أمني**: الرجاء تغيير بيانات الدخول الافتراضية فوراً بعد أول تسجيل دخول!

---

## 📱 لقطات الشاشة

### لوحة التحكم
واجهة رئيسية شاملة مع إحصائيات فورية ورسوم بيانية تفاعلية

### إدارة الوحدات
نظام متكامل لإدارة الوحدات التجارية مع جميع التفاصيل

### التقارير
تقارير مفصلة وقابلة للتصدير مع رسوم بيانية احترافية

---

## 🔧 إدارة النظام

### الأوامر الأساسية

```bash
# عرض سجلات النظام
docker-compose logs -f

# إيقاف النظام
docker-compose down

# إعادة تشغيل النظام
docker-compose restart

# إعادة بناء الحاويات
docker-compose build --no-cache

# تنظيف النظام بالكامل
docker-compose down -v
```

### النسخ الاحتياطي

```bash
# نسخ قاعدة البيانات
docker exec smartmall_mongodb mongodump --out /backup

# استعادة قاعدة البيانات
docker exec smartmall_mongodb mongorestore /backup
```

---

## 🌍 المتغيرات البيئية

قم بتعديل ملف `backend/.env`:

```env
# إعدادات التطبيق
APP_NAME=Smart Mall CRM Park St.
PORT=5000
DEBUG=False

# مفاتيح الأمان (غيّرها!)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# قاعدة البيانات
MONGO_URI=mongodb://mongodb:27017/
MONGO_DB_NAME=smart_mall_crm
```

---

## 📚 بنية المشروع

```
smart-mall-crm-complete/
├── backend/                 # Backend Flask
│   ├── app.py              # التطبيق الرئيسي
│   ├── requirements.txt    # المكتبات المطلوبة
│   └── .env.example        # مثال الإعدادات
│
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/    # المكونات
│   │   ├── pages/         # الصفحات
│   │   ├── store/         # Zustand Store
│   │   ├── utils/         # المساعدات
│   │   └── main.jsx       # نقطة الدخول
│   ├── package.json
│   └── vite.config.js
│
├── docker/                 # إعدادات Docker
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
│
├── scripts/               # السكريبتات
│   └── setup.sh          # سكريبت التشغيل
│
├── docs/                  # الوثائق
└── README.md             # هذا الملف
```

---

## 🔌 API Documentation

### المصادقة

```bash
# تسجيل الدخول
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@smartmall.com",
  "password": "admin123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "user_123",
    "name": "مدير النظام",
    "role": "admin"
  }
}
```

### الوحدات التجارية

```bash
# الحصول على جميع الوحدات
GET /api/units
Authorization: Bearer {token}

# إنشاء وحدة جديدة
POST /api/units
Authorization: Bearer {token}
Content-Type: application/json

{
  "unit_number": "A-101",
  "floor": "1",
  "area": 150,
  "rental_price": 5000,
  "type": "retail",
  "status": "available"
}
```

للمزيد من التفاصيل، راجع [وثائق API الكاملة](docs/API.md)

---

## 🛠️ التطوير

### إعداد بيئة التطوير

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python app.py

# Frontend
cd frontend
npm install
npm run dev
```

### المساهمة

نرحب بمساهماتكم! الرجاء اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء فرع للميزة (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

---

## 🐛 المشاكل الشائعة وحلولها

### المشكلة: فشل الاتصال بقاعدة البيانات

```bash
# الحل
docker-compose restart mongodb
docker-compose logs mongodb
```

### المشكلة: خطأ في بناء Frontend

```bash
# الحل
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### المشكلة: Port مستخدم بالفعل

```bash
# الحل - تغيير المنفذ في docker-compose.yml
ports:
  - "8080:80"  # بدلاً من 80:80
```

---

## 📊 الأداء والتحسينات

- ⚡ استجابة API أقل من 100ms
- 📦 حجم Bundle مُحسّن
- 🔄 Caching ذكي
- 📱 تحميل تدريجي للصور
- 🎨 CSS مُحسّن

---

## 🔐 الأمان

### أفضل الممارسات المطبقة

- ✅ تشفير كلمات المرور مع bcrypt
- ✅ JWT مع انتهاء صلاحية
- ✅ HTTPS إلزامي في الإنتاج
- ✅ حماية من SQL Injection
- ✅ تحديث مستمر للمكتبات
- ✅ Rate Limiting
- ✅ CORS محدد

### التوصيات للإنتاج

1. غيّر جميع المفاتيح السرية
2. فعّل HTTPS
3. استخدم قاعدة بيانات خارجية
4. فعّل Firewall
5. راقب السجلات
6. نفّذ النسخ الاحتياطي الدوري

---

## 🌟 الخطط المستقبلية

- [ ] تطبيق موبايل (React Native)
- [ ] إشعارات فورية
- [ ] تقارير متقدمة بالذكاء الاصطناعي
- [ ] دعم لغات إضافية
- [ ] تكامل مع أنظمة الدفع
- [ ] واجهة API عامة
- [ ] نظام الحجز الإلكتروني

---

## 📞 الدعم والتواصل

- 📧 البريد: support@smartmallcrm.com
- 🌐 الموقع: www.smartmallcrm.com
- 💬 Discord: [انضم للمجتمع](https://discord.gg/smartmall)
- 📱 تويتر: [@SmartMallCRM](https://twitter.com/smartmallcrm)

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

## 👏 شكر وتقدير

شكراً لكل من ساهم في تطوير هذا المشروع:

- فريق Flask
- فريق React
- فريق MongoDB
- مجتمع المطورين العرب

---

## 📈 الإحصائيات

![GitHub Stars](https://img.shields.io/github/stars/your-repo/smart-mall-crm?style=social)
![GitHub Forks](https://img.shields.io/github/forks/your-repo/smart-mall-crm?style=social)
![GitHub Issues](https://img.shields.io/github/issues/your-repo/smart-mall-crm)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/your-repo/smart-mall-crm)

---

<div align="center">

**صُنع بـ ❤️ في السعودية**

© 2024 Smart Mall CRM Park St. - جميع الحقوق محفوظة

[⬆ العودة للأعلى](#-smart-mall-crm-park-st)

</div>
