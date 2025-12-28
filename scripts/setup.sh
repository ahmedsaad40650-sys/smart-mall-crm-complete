#!/bin/bash
# Smart Mall CRM - سكريبت الإعداد التلقائي

set -e

echo "======================================"
echo "  Smart Mall CRM Park St."
echo "  سكريبت الإعداد والتشغيل التلقائي"
echo "======================================"
echo ""

# التحقق من وجود Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker غير مثبت. الرجاء تثبيت Docker أولاً"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose غير مثبت. الرجاء تثبيت Docker Compose أولاً"
    exit 1
fi

echo "✅ Docker و Docker Compose متوفران"
echo ""

# الانتقال إلى مجلد المشروع
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

echo "📁 مجلد المشروع: $PROJECT_DIR"
echo ""

# إنشاء ملف .env إذا لم يكن موجوداً
if [ ! -f backend/.env ]; then
    echo "📝 إنشاء ملف .env..."
    cp backend/.env.example backend/.env
    echo "✅ تم إنشاء ملف .env"
else
    echo "✅ ملف .env موجود"
fi

echo ""
echo "🚀 بدء بناء وتشغيل الحاويات..."
echo ""

# بناء وتشغيل الحاويات
cd docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "⏳ انتظار تشغيل الخدمات..."
sleep 10

# التحقق من حالة الخدمات
echo ""
echo "📊 حالة الخدمات:"
docker-compose ps

echo ""
echo "======================================"
echo "  ✅ تم التشغيل بنجاح!"
echo "======================================"
echo ""
echo "🌐 الروابط:"
echo "  • الواجهة الأمامية: http://localhost:80"
echo "  • API الخلفية: http://localhost:5000"
echo "  • قاعدة البيانات: mongodb://localhost:27017"
echo ""
echo "🔐 بيانات الدخول الافتراضية:"
echo "  • البريد: admin@smartmall.com"
echo "  • كلمة المرور: admin123"
echo ""
echo "📝 الأوامر المفيدة:"
echo "  • عرض السجلات: docker-compose logs -f"
echo "  • إيقاف الخدمات: docker-compose down"
echo "  • إعادة التشغيل: docker-compose restart"
echo ""
