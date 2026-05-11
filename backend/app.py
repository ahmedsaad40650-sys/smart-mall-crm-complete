#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Mall CRM Park St. - التطبيق الرئيسي
نظام إدارة المولات الذكية الاحترافي
"""

from flask import Flask, jsonify, request, send_file
from datetime import datetime
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import uuid
from dotenv import load_dotenv
import logging
from functools import wraps

# تحميل المتغيرات البيئية
load_dotenv()

# إنشاء تطبيق Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'smart-mall-crm-secret-key-2024')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-2024')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# File Upload Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'mov', 'webm'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create uploads directory
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# تفعيل CORS
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

# تفعيل JWT
jwt = JWTManager(app)

# إعداد السجلات
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# الاتصال بقاعدة البيانات MongoDB
try:
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    client = MongoClient(mongo_uri)
    db = client['smart_mall_crm']
    logger.info("✅ تم الاتصال بقاعدة البيانات بنجاح")
except Exception as e:
    logger.error(f"❌ فشل الاتصال بقاعدة البيانات: {e}")
    db = None

# المجموعات (Collections)
users_collection = db['users'] if db is not None else None
units_collection = db['units'] if db is not None else None
tenants_collection = db['tenants'] if db is not None else None
contracts_collection = db['contracts'] if db is not None else None
maintenance_collection = db['maintenance_requests'] if db is not None else None
permits_collection = db['permits'] if db is not None else None
invoices_collection = db['invoices'] if db is not None else None
payments_collection = db['payments'] if db is not None else None
violations_collection = db['violations'] if db is not None else None
portal_news_collection = db['portal_news'] if db is not None else None
portal_events_collection = db['portal_events'] if db is not None else None
portal_offers_collection = db['portal_offers'] if db is not None else None
portal_shops_collection = db['portal_shops'] if db is not None else None
portal_manuals_collection = db['portal_manuals'] if db is not None else None
notifications_collection = db['notifications'] if db is not None else None
chat_messages_collection = db['chat_messages'] if db is not None else None
work_orders_collection = db['work_orders'] if db is not None else None
file_attachments_collection = db['file_attachments'] if db is not None else None
gates_collection = db['gates'] if db is not None else None
restaurants_collection = db['restaurants'] if db is not None else None
footfall_collection = db['footfall'] if db is not None else None
occupancy_collection = db['occupancy'] if db is not None else None

# ===========================================
# Decorators - المساعدات والمصادقات
# ===========================================

# Role Permissions Matrix - Synchronized with Frontend
ROLE_PERMISSIONS = {
    # Executive Level - Full Access
    'ceo': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_violations', 'manage_collections', 'manage_permits', 'approve_permits', 'manage_marketing', 'view_reports', 'export_data', 'manage_security', 'manage_safety', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall', 'manage_notifications'],
    'mall_director': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_violations', 'manage_collections', 'manage_permits', 'approve_permits', 'manage_marketing', 'view_reports', 'export_data', 'manage_security', 'manage_safety', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall', 'manage_notifications'],
    'operations_sector_manager': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_violations', 'manage_collections', 'manage_permits', 'approve_permits', 'manage_marketing', 'view_reports', 'export_data', 'manage_security', 'manage_safety', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall', 'manage_notifications'],
    
    # Department Directors - Full Access
    'security_director': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_violations', 'manage_collections', 'manage_permits', 'approve_permits', 'manage_marketing', 'view_reports', 'export_data', 'manage_security', 'manage_safety', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall'],
    'safety_director': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_violations', 'manage_collections', 'manage_permits', 'approve_permits', 'manage_marketing', 'view_reports', 'export_data', 'manage_security', 'manage_safety', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall'],
    'maintenance_director': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_violations', 'manage_collections', 'manage_permits', 'approve_permits', 'manage_marketing', 'view_reports', 'export_data', 'manage_security', 'manage_safety', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall'],
    
    # Administrative Level
    'admin': ['manage_users', 'manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'view_reports', 'export_data', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall', 'manage_permits'],
    
    # Operational Level - Strong Permissions
    'operations': ['manage_units', 'manage_tenants', 'manage_contracts', 'manage_maintenance', 'manage_permits', 'view_reports', 'export_data', 'view_dashboard', 'view_permits', 'view_violations', 'view_portal', 'view_footfall'],
    'collections': ['manage_violations', 'manage_collections', 'view_invoices', 'block_units', 'view_reports', 'view_permits', 'view_violations', 'manage_notifications'],
    'marketing': ['manage_permits', 'approve_permits', 'manage_marketing', 'manage_events', 'manage_ads', 'view_permits'],
    
    # Supervisors
    'security_supervisor': ['manage_security', 'view_reports', 'manage_permits', 'approve_permits', 'create_incidents', 'view_permits', 'view_violations'],
    'safety_supervisor': ['manage_safety', 'view_reports', 'manage_permits', 'approve_permits', 'view_permits', 'view_violations'],
    
    # Technical
    'maintenance_tech': ['manage_maintenance', 'update_maintenance_status'],
    
    # View Only
    'viewer': ['view_reports'],
    
    # Tenant Level
    'tenant': ['view_portal', 'manage_maintenance', 'view_permits', 'manage_permits'],
}

# Rate Limiting Storage (in production, use Redis)
login_attempts = {}

def admin_required(fn):
    """التحقق من صلاحيات المسؤول"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        if not user or user.get('role') not in ['admin', 'super_admin']:
            return jsonify({'error': 'غير مصرح لك بالوصول'}), 403
        return fn(*args, **kwargs)
    return wrapper

def role_required(allowed_roles):
    """التحقق من دور المستخدم"""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = users_collection.find_one({'_id': current_user_id})
            if not user:
                return jsonify({'error': 'المستخدم غير موجود'}), 404
            if user.get('role') not in allowed_roles:
                return jsonify({'error': 'غير مصرح لك بتنفيذ هذا الإجراء'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def permission_required(permission):
    """التحقق من صلاحية محددة"""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = users_collection.find_one({'_id': current_user_id})
            if not user:
                return jsonify({'error': 'المستخدم غير موجود'}), 404
            user_role = user.get('role', 'viewer')
            user_permissions = ROLE_PERMISSIONS.get(user_role, [])
            if permission not in user_permissions:
                return jsonify({'error': 'ليس لديك الصلاحية لتنفيذ هذا الإجراء'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

check_permission = permission_required

def check_rate_limit(email):
    """فحص معدل محاولات الدخول"""
    now = datetime.now()
    if email in login_attempts:
        attempts, last_attempt = login_attempts[email]
        # Reset after 15 minutes
        if (now - last_attempt).total_seconds() > 900:
            login_attempts[email] = (0, now)
            return True
        if attempts >= 5:
            return False
    return True

@app.route('/api/admin/purge-test-data', methods=['POST'])
@jwt_required()
def purge_test_data():
    """تطهير قاعدة البيانات من كافة البيانات التجريبية (للمدراء فقط)"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'غير مصرح لك بتنفيذ هذا الإجراء'}), 403
            
        collections_to_clear = [
            'tenants', 'contracts', 'invoices', 'payments', 
            'maintenance_requests', 'violations', 'work_orders', 
            'notifications', 'chat_messages', 'footfall', 'occupancy', 'units'
        ]
        
        results = {}
        for coll_name in collections_to_clear:
            count = db[coll_name].count_documents({})
            db[coll_name].delete_many({})
            results[coll_name] = count
            
        logger.info(f"💣 Database purge executed by {user['email']}: {results}")
        return jsonify({
            'message': 'تم تطهير قاعدة البيانات بنجاح والحذف النهائي للبيانات التجريبية',
            'details': results
        }), 200
    except Exception as e:
        logger.error(f"Error during purge: {e}")
        return jsonify({'error': 'حدث خطأ أثناء تطهير البيانات'}), 500

def record_login_attempt(email, success=False):
    """تسجيل محاولة دخول"""
    now = datetime.now()
    if success:
        if email in login_attempts:
            del login_attempts[email]
        return
    
    if email in login_attempts:
        attempts, _ = login_attempts[email]
        login_attempts[email] = (attempts + 1, now)
    else:
        login_attempts[email] = (1, now)

# ===========================================
# المسارات العامة - General Routes
# ===========================================

@app.route('/')
def home():
    """الصفحة الرئيسية"""
    return jsonify({
        'app': 'Smart Mall CRM Park St.',
        'version': '1.0.0',
        'status': 'running',
        'message': 'نظام إدارة المولات الذكية الاحترافي',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/health')
def health_check():
    """فحص صحة النظام"""
    db_status = 'connected' if db is not None else 'disconnected'
    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "Backend is working", "status": "ok"})

@app.route('/test/login', methods=['POST'])
def test_login():
    return jsonify({
        "success": True,
        "token": "test_token_123",
        "user": {
            "id": 1,
            "email": "test@test.com",
            "name": "Test User",
            "role": "admin"
        }
    })

# ===========================================
# المصادقة - Authentication
# ===========================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """تسجيل مستخدم جديد"""
    try:
        data = request.get_json()
        
        # التحقق من البيانات المطلوبة
        required_fields = ['email', 'password', 'name']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        # التحقق من وجود المستخدم
        if users_collection.find_one({'email': data['email']}):
            return jsonify({'error': 'البريد الإلكتروني مسجل مسبقاً'}), 400
        
        # إنشاء المستخدم
        user = {
            '_id': f"user_{datetime.now().timestamp()}",
            'email': data['email'],
            'password': generate_password_hash(data['password']),
            'name': data['name'],
            'phone': data.get('phone', ''),
            'role': data.get('role', 'user'),
            'status': 'active',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        users_collection.insert_one(user)
        
        return jsonify({
            'message': 'تم التسجيل بنجاح',
            'user': {
                'id': user['_id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role']
            }
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في التسجيل: {e}")
        return jsonify({'error': 'حدث خطأ في التسجيل'}), 500

@app.route('/auth/register', methods=['POST'])
def register_alias():
    """مسار بديل لتسجيل مستخدم جديد"""
    return register()

@app.route('/api/auth/login', methods=['POST'])
def login():
    """تسجيل الدخول مع حماية أمنية متقدمة"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'الرجاء إدخال البريد وكلمة المرور'}), 400
        
        email = data['email'].lower().strip()
        
        # فحص معدل المحاولات (Rate Limiting)
        if not check_rate_limit(email):
            return jsonify({
                'error': 'تم تجاوز الحد الأقصى لمحاولات الدخول. حاول مرة أخرى بعد 15 دقيقة.',
                'locked': True
            }), 423
        
        # البحث عن المستخدم
        user = users_collection.find_one({'email': email})
        
        if not user or not check_password_hash(user['password'], data['password']):
            record_login_attempt(email, success=False)
            return jsonify({'error': 'بيانات الدخول غير صحيحة'}), 401
        
        # فحص حالة الحساب
        if user.get('status') != 'active':
            return jsonify({'error': 'الحساب غير نشط. تواصل مع الإدارة.'}), 403
        
        # فحص قفل الحساب
        if user.get('locked_until'):
            locked_until = datetime.fromisoformat(user['locked_until'])
            if datetime.now() < locked_until:
                return jsonify({
                    'error': 'الحساب مقفل مؤقتاً. حاول مرة أخرى لاحقاً.',
                    'locked': True
                }), 423
        
        # تسجيل نجاح الدخول
        record_login_attempt(email, success=True)
        
        # تحديث آخر تسجيل دخول
        users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {
                'last_login': datetime.now().isoformat(),
                'failed_login_attempts': 0,
                'locked_until': None
            }}
        )
        
        # إنشاء التوكن
        access_token = create_access_token(identity=user['_id'])
        
        return jsonify({
            'message': 'تم تسجيل الدخول بنجاح',
            'access_token': access_token,
            'user': {
                'id': user['_id'],
                'email': user['email'],
                'name': user['name'],
                'role': user.get('role', 'viewer'),
                'permissions': ROLE_PERMISSIONS.get(user.get('role', 'viewer'), [])
            }
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في تسجيل الدخول: {e}")
        return jsonify({'error': 'حدث خطأ في تسجيل الدخول'}), 500

@app.route('/auth/login', methods=['POST'])
def login_alias():
    """مسار بديل لتسجيل الدخول"""
    return login()

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """الحصول على بيانات المستخدم الحالي"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        
        if not user:
            return jsonify({'error': 'المستخدم غير موجود'}), 404
        
        return jsonify({
            'id': user['_id'],
            'email': user['email'],
            'name': user['name'],
            'phone': user.get('phone', ''),
            'role': user['role'],
            'status': user['status']
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على بيانات المستخدم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user_alias():
    """مسار بديل لجلب بيانات المستخدم الحالي"""
    return get_current_user()

# ===========================================
# إدارة المستخدمين - Users Management
# ===========================================

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    """الحصول على جميع المستخدمين"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        user_role = user.get('role', 'viewer') if user else 'viewer'
        
        # Check permission
        user_permissions = ROLE_PERMISSIONS.get(user_role, [])
        if 'manage_users' not in user_permissions:
            return jsonify({'error': 'ليس لديك صلاحية عرض المستخدمين'}), 403
        
        status = request.args.get('status')
        role = request.args.get('role')
        
        query = {}
        if status:
            query['status'] = status
        if role:
            query['role'] = role
        
        users = list(users_collection.find(query))
        
        for u in users:
            if '_id' in u:
                u['id'] = u['_id']
                del u['_id']
            # Remove password from response
            if 'password' in u:
                del u['password']
        
        return jsonify({
            'users': users,
            'total': len(users)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المستخدمين: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    """إنشاء مستخدم جديد"""
    try:
        current_user_id = get_jwt_identity()
        current_user = users_collection.find_one({'_id': current_user_id})
        user_role = current_user.get('role', 'viewer') if current_user else 'viewer'
        
        # Check permission
        user_permissions = ROLE_PERMISSIONS.get(user_role, [])
        if 'manage_users' not in user_permissions:
            return jsonify({'error': 'ليس لديك صلاحية إضافة مستخدمين'}), 403
        
        data = request.get_json()
        
        required_fields = ['email', 'password', 'name', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        # Check if email exists
        if users_collection.find_one({'email': data['email'].lower().strip()}):
            return jsonify({'error': 'البريد الإلكتروني مسجل مسبقاً'}), 400
        
        user = {
            '_id': f"user_{datetime.now().timestamp()}",
            'email': data['email'].lower().strip(),
            'password': generate_password_hash(data['password']),
            'name': data['name'],
            'phone': data.get('phone', ''),
            'role': data['role'],
            'status': data.get('status', 'active'),
            'created_by': current_user_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        users_collection.insert_one(user)
        
        # Remove password from response
        del user['password']
        user['id'] = user['_id']
        del user['_id']
        
        return jsonify({
            'message': 'تم إنشاء المستخدم بنجاح',
            'user': user
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء المستخدم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """الحصول على بيانات مستخدم محدد"""
    try:
        user = users_collection.find_one({'_id': user_id})
        
        if not user:
            return jsonify({'error': 'المستخدم غير موجود'}), 404
        
        if '_id' in user:
            user['id'] = user['_id']
            del user['_id']
        if 'password' in user:
            del user['password']
        
        return jsonify(user), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المستخدم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """تحديث بيانات مستخدم"""
    try:
        current_user_id = get_jwt_identity()
        current_user = users_collection.find_one({'_id': current_user_id})
        user_role = current_user.get('role', 'viewer') if current_user else 'viewer'
        
        # Check permission
        user_permissions = ROLE_PERMISSIONS.get(user_role, [])
        if 'manage_users' not in user_permissions:
            return jsonify({'error': 'ليس لديك صلاحية تعديل المستخدمين'}), 403
        
        user = users_collection.find_one({'_id': user_id})
        if not user:
            return jsonify({'error': 'المستخدم غير موجود'}), 404
        
        data = request.get_json()
        update_data = {'updated_at': datetime.now().isoformat()}
        
        allowed_fields = ['name', 'email', 'phone', 'role', 'status']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Handle password update
        if data.get('password'):
            update_data['password'] = generate_password_hash(data['password'])
        
        users_collection.update_one({'_id': user_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث المستخدم بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث المستخدم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """حذف مستخدم"""
    try:
        current_user_id = get_jwt_identity()
        current_user = users_collection.find_one({'_id': current_user_id})
        user_role = current_user.get('role', 'viewer') if current_user else 'viewer'
        
        # Check permission
        user_permissions = ROLE_PERMISSIONS.get(user_role, [])
        if 'manage_users' not in user_permissions:
            return jsonify({'error': 'ليس لديك صلاحية حذف المستخدمين'}), 403
        
        # Prevent self-deletion
        if user_id == current_user_id:
            return jsonify({'error': 'لا يمكنك حذف حسابك الخاص'}), 400
        
        result = users_collection.delete_one({'_id': user_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'المستخدم غير موجود'}), 404
        
        return jsonify({'message': 'تم حذف المستخدم بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في حذف المستخدم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# إدارة الوحدات التجارية - Units Management
# ===========================================

@app.route('/api/units', methods=['GET'])
@jwt_required()
def get_units():
    """الحصول على جميع الوحدات التجارية"""
    try:
        status = request.args.get('status')
        query = {}
        if status:
            query['status'] = status
        
        units = list(units_collection.find(query))
        
        # تحويل ObjectId إلى string
        for unit in units:
            if '_id' in unit:
                unit['id'] = unit['_id']
                del unit['_id']
        
        return jsonify({
            'units': units,
            'total': len(units)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الوحدات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/units', methods=['POST'])
@jwt_required()
def create_unit():
    """إنشاء وحدة تجارية جديدة"""
    try:
        data = request.get_json()
        
        required_fields = ['unit_number', 'floor', 'area']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        # التحقق من عدم تكرار رقم الوحدة
        if units_collection.find_one({'unit_number': data['unit_number']}):
            return jsonify({'error': 'رقم الوحدة موجود مسبقاً'}), 400
        
        unit = {
            '_id': f"unit_{datetime.now().timestamp()}",
            'unit_number': data['unit_number'],
            'floor': data['floor'],
            'area': float(data['area']),
            'rental_price': float(data.get('rental_price', 0)),
            'type': data.get('type', 'retail'),
            'status': data.get('status', 'available'),
            'owner_name': data.get('owner_name', ''),
            'owner_contact': data.get('owner_contact', ''),
            'description': data.get('description', ''),
            'amenities': data.get('amenities', []),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        units_collection.insert_one(unit)
        
        return jsonify({
            'message': 'تم إنشاء الوحدة بنجاح',
            'unit': unit
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء الوحدة: {e}")
        return jsonify({'error': 'حدث خطأ في إنشاء الوحدة'}), 500

@app.route('/api/units/<unit_id>', methods=['GET'])
@jwt_required()
def get_unit(unit_id):
    """الحصول على تفاصيل وحدة محددة"""
    try:
        unit = units_collection.find_one({'_id': unit_id})
        
        if not unit:
            return jsonify({'error': 'الوحدة غير موجودة'}), 404
        
        if '_id' in unit:
            unit['id'] = unit['_id']
            del unit['_id']
        
        return jsonify(unit), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الوحدة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/units/<unit_id>', methods=['PUT'])
@jwt_required()
def update_unit(unit_id):
    """تحديث بيانات وحدة"""
    try:
        data = request.get_json()
        
        unit = units_collection.find_one({'_id': unit_id})
        if not unit:
            return jsonify({'error': 'الوحدة غير موجودة'}), 404
        
        # تحديث البيانات
        update_data = {
            'updated_at': datetime.now().isoformat()
        }
        
        allowed_fields = ['unit_number', 'floor', 'area', 'rental_price', 'type', 'status', 'description', 'amenities', 'owner_name', 'owner_contact']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        units_collection.update_one({'_id': unit_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث الوحدة بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث الوحدة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/units/<unit_id>', methods=['DELETE'])
@admin_required
def delete_unit(unit_id):
    """حذف وحدة"""
    try:
        result = units_collection.delete_one({'_id': unit_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'الوحدة غير موجودة'}), 404
        
        return jsonify({'message': 'تم حذف الوحدة بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في حذف الوحدة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# إدارة المستأجرين - Tenants Management
# ===========================================

@app.route('/api/tenants', methods=['GET'])
@jwt_required()
def get_tenants():
    """الحصول على جميع المستأجرين"""
    try:
        status = request.args.get('status')
        query = {}
        if status:
            query['status'] = status
        
        tenants = list(tenants_collection.find(query))
        
        for tenant in tenants:
            if '_id' in tenant:
                tenant['id'] = tenant['_id']
                del tenant['_id']
        
        return jsonify({
            'tenants': tenants,
            'total': len(tenants)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المستأجرين: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/tenants', methods=['POST'])
@jwt_required()
def create_tenant():
    """إضافة مستأجر جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'email', 'phone', 'business_name']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        # التحقق من عدم تكرار البريد
        if tenants_collection.find_one({'email': data['email']}):
            return jsonify({'error': 'البريد الإلكتروني مسجل مسبقاً'}), 400
        
        tenant = {
            '_id': f"tenant_{datetime.now().timestamp()}",
            'name': data['name'],
            'email': data['email'],
            'phone': data['phone'],
            'business_name': data['business_name'],
            'business_type': data.get('business_type', ''),
            'tax_id': data.get('tax_id', ''),
            'address': data.get('address', ''),
            'unit_id': data.get('unit_id', ''),
            'status': data.get('status', 'active'),
            'notes': data.get('notes', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        tenants_collection.insert_one(tenant)
        
        return jsonify({
            'message': 'تم إضافة المستأجر بنجاح',
            'tenant': tenant
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إضافة المستأجر: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/tenants/<tenant_id>', methods=['GET'])
@jwt_required()
def get_tenant(tenant_id):
    """الحصول على تفاصيل مستأجر"""
    try:
        tenant = tenants_collection.find_one({'_id': tenant_id})
        
        if not tenant:
            return jsonify({'error': 'المستأجر غير موجود'}), 404
        
        if '_id' in tenant:
            tenant['id'] = tenant['_id']
            del tenant['_id']
        
        return jsonify(tenant), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المستأجر: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/tenants/<tenant_id>', methods=['PUT'])
@jwt_required()
def update_tenant(tenant_id):
    """تحديث بيانات مستأجر"""
    try:
        data = request.get_json()
        
        tenant = tenants_collection.find_one({'_id': tenant_id})
        if not tenant:
            return jsonify({'error': 'المستأجر غير موجود'}), 404
        
        update_data = {'updated_at': datetime.now().isoformat()}
        
        allowed_fields = ['name', 'email', 'phone', 'business_name', 'business_type', 'tax_id', 'address', 'status', 'notes', 'unit_id']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        tenants_collection.update_one({'_id': tenant_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث المستأجر بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث المستأجر: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# إدارة العقود - Contracts Management
# ===========================================

@app.route('/api/contracts', methods=['GET'])
@jwt_required()
def get_contracts():
    """الحصول على جميع العقود"""
    try:
        status = request.args.get('status')
        tenant_id = request.args.get('tenant_id')
        unit_id = request.args.get('unit_id')
        
        query = {}
        if status:
            query['status'] = status
        if tenant_id:
            query['tenant_id'] = tenant_id
        if unit_id:
            query['unit_id'] = unit_id
        
        contracts = list(contracts_collection.find(query))
        
        for contract in contracts:
            if '_id' in contract:
                contract['id'] = contract['_id']
                del contract['_id']
        
        return jsonify({
            'contracts': contracts,
            'total': len(contracts)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على العقود: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/contracts', methods=['POST'])
@jwt_required()
def create_contract():
    """إنشاء عقد جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['tenant_id', 'unit_id', 'start_date', 'end_date', 'monthly_rent', 'deposit']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        # التحقق من وجود المستأجر والوحدة
        if not tenants_collection.find_one({'_id': data['tenant_id']}):
            return jsonify({'error': 'المستأجر غير موجود'}), 404
        
        if not units_collection.find_one({'_id': data['unit_id']}):
            return jsonify({'error': 'الوحدة غير موجودة'}), 404
        
        contract = {
            '_id': f"contract_{datetime.now().timestamp()}",
            'contract_number': f"CNT{int(datetime.now().timestamp())}",
            'tenant_id': data['tenant_id'],
            'unit_id': data['unit_id'],
            'start_date': data['start_date'],
            'end_date': data['end_date'],
            'monthly_rent': float(data['monthly_rent']),
            'deposit': float(data['deposit']),
            'payment_day': data.get('payment_day', 1),
            'status': data.get('status', 'active'),
            'terms': data.get('terms', ''),
            'notes': data.get('notes', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        contracts_collection.insert_one(contract)
        
        # تحديث حالة الوحدة
        units_collection.update_one(
            {'_id': data['unit_id']},
            {'$set': {'status': 'rented', 'updated_at': datetime.now().isoformat()}}
        )
        
        return jsonify({
            'message': 'تم إنشاء العقد بنجاح',
            'contract': contract
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء العقد: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# إدارة طلبات الصيانة - Maintenance Requests
# ===========================================

@app.route('/api/maintenance', methods=['GET'])
@jwt_required()
def get_maintenance_requests():
    """الحصول على جميع طلبات الصيانة"""
    try:
        status = request.args.get('status')
        priority = request.args.get('priority')
        
        query = {}
        if status:
            query['status'] = status
        if priority:
            query['priority'] = priority
        
        requests = list(maintenance_collection.find(query))
        
        for req in requests:
            if '_id' in req:
                req['id'] = req['_id']
                del req['_id']
        
        return jsonify({
            'requests': requests,
            'total': len(requests)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على طلبات الصيانة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/maintenance', methods=['POST'])
@jwt_required()
def create_maintenance_request():
    """إنشاء طلب صيانة جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        required_fields = ['unit_id', 'title', 'description']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        request_data = {
            '_id': f"maint_{datetime.now().timestamp()}",
            'request_number': f"MNT{int(datetime.now().timestamp())}",
            'unit_id': data['unit_id'],
            'title': data['title'],
            'description': data['description'],
            'category': data.get('category', 'general'),
            'priority': data.get('priority', 'medium'),
            'status': 'pending',
            'reported_by': current_user_id,
            'reported_at': datetime.now().isoformat(),
            'notes': data.get('notes', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        maintenance_collection.insert_one(request_data)
        
        return jsonify({
            'message': 'تم إنشاء طلب الصيانة بنجاح',
            'request': request_data
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء طلب الصيانة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/maintenance/<request_id>', methods=['PUT'])
@jwt_required()
def update_maintenance_request(request_id):
    """تحديث طلب صيانة"""
    try:
        data = request.get_json()
        
        request_data = maintenance_collection.find_one({'_id': request_id})
        if not request_data:
            return jsonify({'error': 'الطلب غير موجود'}), 404
        
        update_data = {'updated_at': datetime.now().isoformat()}
        
        allowed_fields = ['status', 'priority', 'notes', 'assigned_to', 'completed_at']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        maintenance_collection.update_one({'_id': request_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث الطلب بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث طلب الصيانة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# تكاليف الصيانة وأوامر العمل - Maintenance Cost & Work Orders
# ===========================================

def allowed_file(filename):
    """التحقق من امتداد الملف المسموح"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/maintenance/<request_id>/cost', methods=['PUT'])

# Existing cost handling code remains unchanged

# New route: Get chat messages for a maintenance request
@app.route('/api/maintenance/<request_id>/chat', methods=['GET'])
@jwt_required()
def get_maintenance_chat(request_id):
    try:
        messages = list(chat_messages_collection.find({'maintenance_id': request_id}).sort('created_at', 1))
        for m in messages:
            m['_id'] = str(m['_id'])
            m['created_at'] = m['created_at'].isoformat()
        return jsonify({'messages': messages}), 200
    except Exception as e:
        logger.error(f"❌ Error fetching chat messages: {e}")
        return jsonify({'error': 'Failed to fetch chat messages'}), 500

# New route: Post a chat message
@app.route('/api/maintenance/<request_id>/chat', methods=['POST'])
@jwt_required()
def post_maintenance_chat(request_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        message = {
            'maintenance_id': request_id,
            'sender_id': user_id,
            'text': data.get('text', ''),
            'created_at': datetime.utcnow()
        }
        chat_messages_collection.insert_one(message)
        return jsonify({'message': 'Chat message saved'}), 201
    except Exception as e:
        logger.error(f"❌ Error saving chat message: {e}")
        return jsonify({'error': 'Failed to save chat message'}), 500
@app.route('/api/maintenance/<request_id>/cost', methods=['PUT'])
@jwt_required()
def set_maintenance_cost(request_id):
    """تحديد تكلفة الصيانة من قبل المسؤول"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        maint_request = maintenance_collection.find_one({'_id': request_id})
        if not maint_request:
            return jsonify({'error': 'طلب الصيانة غير موجود'}), 404
        
        estimated_cost = float(data.get('estimated_cost', 0))
        cost_notes = data.get('cost_notes', '')
        cost_breakdown = data.get('cost_breakdown', {})
        
        update_data = {
            'estimated_cost': estimated_cost,
            'cost_notes': cost_notes,
            'cost_breakdown': cost_breakdown,
            'cost_submitted_by': current_user_id,
            'cost_submitted_at': datetime.now().isoformat(),
            'status': 'cost_submitted',
            'updated_at': datetime.now().isoformat()
        }
        
        maintenance_collection.update_one({'_id': request_id}, {'$set': update_data})
        
        # إرسال إشعار للمستأجر
        if maint_request.get('tenant_id'):
            notification = {
                '_id': f"notif_{datetime.now().timestamp()}",
                'user_id': maint_request.get('tenant_id'),
                'title': 'تكلفة صيانة جديدة',
                'message': f'تم تحديد تكلفة طلب الصيانة "{maint_request.get("title")}" بمبلغ {estimated_cost} جنيه',
                'type': 'maintenance_cost',
                'reference_id': request_id,
                'read': False,
                'created_at': datetime.now().isoformat()
            }
            notifications_collection.insert_one(notification)
        
        return jsonify({
            'message': 'تم تحديد التكلفة بنجاح',
            'estimated_cost': estimated_cost
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديد تكلفة الصيانة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/maintenance/<request_id>/approve', methods=['PUT'])
    # Existing approval code remains unchanged
@jwt_required()
def approve_maintenance_cost(request_id):
    """موافقة المستأجر على تكلفة الصيانة"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        maint_request = maintenance_collection.find_one({'_id': request_id})
        if not maint_request:
            return jsonify({'error': 'طلب الصيانة غير موجود'}), 404
        
        approval = data.get('approved', False)
        rejection_reason = data.get('rejection_reason', '')
        
        if approval:
            update_data = {
                'status': 'approved',
                'cost_approved_at': datetime.now().isoformat(),
                'cost_approved_by': current_user_id,
                'updated_at': datetime.now().isoformat()
            }
            
            message = 'تمت الموافقة على التكلفة. يمكنك الآن إصدار أمر العمل.'
        else:
            update_data = {
                'status': 'cost_rejected',
                'rejection_reason': rejection_reason,
                'rejected_at': datetime.now().isoformat(),
                'rejected_by': current_user_id,
                'updated_at': datetime.now().isoformat()
            }
            message = 'تم رفض التكلفة'
        
        maintenance_collection.update_one({'_id': request_id}, {'$set': update_data})
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        logger.error(f"خطأ في الموافقة على تكلفة الصيانة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/maintenance/<request_id>/work-order', methods=['POST'])
@jwt_required()
def create_maintenance_work_order(request_id):
    """إنشاء أمر عمل لطلب صيانة معتمد"""
    try:
        current_user_id = get_jwt_identity()
        maint_request = maintenance_collection.find_one({'_id': request_id})
        
        if not maint_request:
            return jsonify({'error': 'طلب الصيانة غير موجود'}), 404
            
        if maint_request.get('status') != 'approved':
            return jsonify({'error': 'يجب الموافقة على التكلفة أولاً'}), 400
            
        if maint_request.get('work_order_id'):
            return jsonify({'error': 'تم إنشاء أمر عمل مسبقاً لهذا الطلب'}), 400

        current_month = datetime.now().strftime('%Y-%m')
        work_order = {
            '_id': f"wo_{datetime.now().timestamp()}",
            'work_order_number': f"WO{int(datetime.now().timestamp())}",
            'maintenance_id': request_id,
            'tenant_id': maint_request.get('tenant_id'),
            'unit_id': maint_request.get('unit_id'),
            'description': maint_request.get('title'),
            'cost': maint_request.get('estimated_cost', 0),
            'month': current_month,
            'status': 'approved',
            # New fields for professional form
            'phone': maint_request.get('phone', ''),
            'authorization': '',
            'received_by': '',
            'permission_mode': 'anytime', # 'anytime' or 'appointment'
            'appointment_date': '',
            'appointment_time': '',
            'executed_by': '',
            'executed_works': '',
            'comments': maint_request.get('notes', ''),
            'client_approval': False,
            'currency': 'EGP',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'created_by': current_user_id
        }
        
        work_orders_collection.insert_one(work_order)
        
        maintenance_collection.update_one(
            {'_id': request_id},
            {'$set': {
                'work_order_id': work_order['_id'],
                'status': 'work_order_created',
                'updated_at': datetime.now().isoformat()
            }}
        )
        
        return jsonify({
            'message': 'تم إنشاء أمر العمل بنجاح',
            'work_order_id': work_order['_id']
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء أمر العمل: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/maintenance/<request_id>/complete', methods=['PUT'])
@jwt_required()
def complete_maintenance(request_id):
    """إكمال طلب الصيانة وتحديث التكلفة الفعلية"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        maint_request = maintenance_collection.find_one({'_id': request_id})
        if not maint_request:
            return jsonify({'error': 'طلب الصيانة غير موجود'}), 404
        
        actual_cost = float(data.get('actual_cost', maint_request.get('estimated_cost', 0)))
        completion_notes = data.get('completion_notes', '')
        
        update_data = {
            'status': 'completed',
            'actual_cost': actual_cost,
            'completion_notes': completion_notes,
            'completed_at': datetime.now().isoformat(),
            'completed_by': current_user_id,
            'updated_at': datetime.now().isoformat()
        }
        
        maintenance_collection.update_one({'_id': request_id}, {'$set': update_data})
        
        # تحديث أمر العمل
        if maint_request.get('work_order_id'):
            work_orders_collection.update_one(
                {'_id': maint_request.get('work_order_id')},
                {'$set': {
                    'status': 'completed',
                    'actual_cost': actual_cost,
                    'cost': actual_cost,
                    'completed_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }}
            )
        
        return jsonify({
            'message': 'تم إكمال طلب الصيانة بنجاح',
            'actual_cost': actual_cost
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في إكمال طلب الصيانة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# رفع وإدارة الملفات - File Upload & Management
# ===========================================

@app.route('/api/files/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """رفع ملف جديد"""
    try:
        current_user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'لم يتم تحديد ملف'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'لم يتم تحديد ملف'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'نوع الملف غير مسموح'}), 400
        
        # إنشاء اسم فريد للملف
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # حفظ الملف
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        # تحديد نوع الملف
        file_type = 'document'
        if file_ext in ['png', 'jpg', 'jpeg', 'gif']:
            file_type = 'image'
        elif file_ext in ['mp4', 'mov', 'webm']:
            file_type = 'video'
        elif file_ext == 'pdf':
            file_type = 'pdf'
        
        # حفظ بيانات الملف في قاعدة البيانات
        file_data = {
            '_id': f"file_{datetime.now().timestamp()}",
            'original_name': original_filename,
            'stored_name': unique_filename,
            'file_type': file_type,
            'mime_type': file.content_type,
            'size': file_size,
            'reference_type': request.form.get('reference_type', 'maintenance'),
            'reference_id': request.form.get('reference_id', ''),
            'uploaded_by': current_user_id,
            'created_at': datetime.now().isoformat()
        }
        
        file_attachments_collection.insert_one(file_data)
        file_data['id'] = file_data['_id']
        del file_data['_id']
        
        return jsonify({
            'message': 'تم رفع الملف بنجاح',
            'file': file_data
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في رفع الملف: {e}")
        return jsonify({'error': 'حدث خطأ في رفع الملف'}), 500

@app.route('/api/files/<file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    """تحميل ملف"""
    try:
        file_data = file_attachments_collection.find_one({'_id': file_id})
        if not file_data:
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_data['stored_name'])
        if not os.path.exists(file_path):
            return jsonify({'error': 'الملف غير موجود على الخادم'}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=file_data['original_name']
        )
        
    except Exception as e:
        logger.error(f"خطأ في تحميل الملف: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/files/<file_id>/preview', methods=['GET'])
@jwt_required()
def preview_file(file_id):
    """معاينة ملف"""
    try:
        file_data = file_attachments_collection.find_one({'_id': file_id})
        if not file_data:
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_data['stored_name'])
        if not os.path.exists(file_path):
            return jsonify({'error': 'الملف غير موجود على الخادم'}), 404
        
        return send_file(file_path, mimetype=file_data.get('mime_type', 'application/octet-stream'))
        
    except Exception as e:
        logger.error(f"خطأ في معاينة الملف: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/files/<file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    """حذف ملف"""
    try:
        file_data = file_attachments_collection.find_one({'_id': file_id})
        if not file_data:
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        # حذف الملف من القرص
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_data['stored_name'])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # حذف من قاعدة البيانات
        file_attachments_collection.delete_one({'_id': file_id})
        
        return jsonify({'message': 'تم حذف الملف بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في حذف الملف: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/maintenance/<request_id>/attachments', methods=['GET'])
@jwt_required()
def get_maintenance_attachments(request_id):
    """الحصول على مرفقات طلب صيانة"""
    try:
        attachments = list(file_attachments_collection.find({
            'reference_type': 'maintenance',
            'reference_id': request_id
        }))
        
        for att in attachments:
            att['id'] = att['_id']
            del att['_id']
        
        return jsonify({'attachments': attachments}), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المرفقات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# أوامر العمل - Work Orders Management
# ===========================================

@app.route('/api/work-orders', methods=['GET'])
@jwt_required()
def get_work_orders():
    """الحصول على جميع أوامر العمل"""
    try:
        status = request.args.get('status')
        tenant_id = request.args.get('tenant_id')
        month = request.args.get('month')
        
        query = {}
        if status:
            query['status'] = status
        if tenant_id:
            query['tenant_id'] = tenant_id
        if month:
            query['month'] = month
        
        work_orders = list(work_orders_collection.find(query).sort('created_at', -1))
        
        for wo in work_orders:
            wo['id'] = wo['_id']
            del wo['_id']
        
        return jsonify({
            'work_orders': work_orders,
            'total': len(work_orders)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على أوامر العمل: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/work-orders/monthly-summary/<tenant_id>', methods=['GET'])
@jwt_required()
def get_monthly_summary(tenant_id):
    """الحصول على ملخص شهري لأوامر العمل للمستأجر"""
    try:
        month = request.args.get('month', datetime.now().strftime('%Y-%m'))
        
        work_orders = list(work_orders_collection.find({
            'tenant_id': tenant_id,
            'month': month
        }))
        
        total_cost = sum(wo.get('cost', 0) for wo in work_orders)
        completed_count = len([wo for wo in work_orders if wo.get('status') == 'completed'])
        pending_count = len([wo for wo in work_orders if wo.get('status') in ['approved', 'in_progress']])
        
        for wo in work_orders:
            wo['id'] = wo['_id']
            del wo['_id']
        
        # الحصول على ملخص الشهر السابق للمقارنة
        prev_month_date = datetime.strptime(month + '-01', '%Y-%m-%d') - timedelta(days=1)
        prev_month = prev_month_date.strftime('%Y-%m')
        prev_work_orders = list(work_orders_collection.find({
            'tenant_id': tenant_id,
            'month': prev_month
        }))
        prev_total_cost = sum(wo.get('cost', 0) for wo in prev_work_orders)
        
        return jsonify({
            'month': month,
            'work_orders': work_orders,
            'summary': {
                'total_cost': total_cost,
                'completed_count': completed_count,
                'pending_count': pending_count,
                'total_count': len(work_orders),
                'previous_month_cost': prev_total_cost,
                'cost_change': total_cost - prev_total_cost
            }
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الملخص الشهري: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/work-orders/generate-invoice-items/<tenant_id>', methods=['POST'])
@jwt_required()
def generate_invoice_items(tenant_id):
    """إنشاء بنود فاتورة من أوامر العمل المكتملة"""
    try:
        data = request.get_json()
        month = data.get('month', datetime.now().strftime('%Y-%m'))
        
        # الحصول على أوامر العمل المكتملة غير المفوترة
        work_orders = list(work_orders_collection.find({
            'tenant_id': tenant_id,
            'month': month,
            'status': 'completed',
            '$or': [{'billed': {'$exists': False}}, {'billed': False}]
        }))
        
        if not work_orders:
            return jsonify({
                'message': 'لا توجد أوامر عمل للفوترة',
                'items': []
            }), 200
        
        invoice_items = []
        total_amount = 0
        
        for wo in work_orders:
            item = {
                'id': str(wo['_id']),
                'description': f"صيانة - {wo.get('description', '')}",
                'amount': wo.get('cost', 0),
                'type': 'maintenance'
            }
            invoice_items.append(item)
            total_amount += wo.get('cost', 0)
            
            # تحديث أمر العمل كمفوتر
            work_orders_collection.update_one(
                {'_id': wo['_id']},
                {'$set': {
                    'billed': True,
                    'billed_at': datetime.now().isoformat()
                }}
            )
        
        return jsonify({
            'message': f'تم إنشاء {len(invoice_items)} بند فاتورة',
            'items': invoice_items,
            'total_amount': total_amount
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء بنود الفاتورة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/violations/generate-invoice-items/<tenant_id>', methods=['POST'])
@jwt_required()
def generate_violation_invoice_items(tenant_id):
    """إنشاء بنود فاتورة من المخالفات المؤكدة"""
    try:
        # الحصول على المخالفات المؤكدة غير المفوترة
        violations = list(violations_collection.find({
            'tenant_id': tenant_id,
            'status': 'confirmed',
            '$or': [{'billed': {'$exists': False}}, {'billed': False}]
        }))
        
        if not violations:
            return jsonify({
                'message': 'لا توجد مخالفات للفوترة',
                'items': []
            }), 200
        
        invoice_items = []
        total_amount = 0
        
        for v in violations:
            item = {
                'id': str(v['_id']),
                'description': f"مخالفة - {v.get('title', v.get('violation_number', ''))}",
                'amount': v.get('amount', 0),
                'type': 'violation'
            }
            invoice_items.append(item)
            total_amount += v.get('amount', 0)
            
            # تحديث المخالفة كمفوترة
            violations_collection.update_one(
                {'_id': v['_id']},
                {'$set': {
                    'billed': True,
                    'billed_at': datetime.now().isoformat()
                }}
            )
        
        return jsonify({
            'message': f'تم إنشاء {len(invoice_items)} بند فاتورة',
            'items': invoice_items,
            'total_amount': total_amount
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء بنود فاتورة المخالفات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/tenants/<tenant_id>/pending-items-count', methods=['GET'])
@jwt_required()
def get_pending_items_count(tenant_id):
    """الحصول على عدد البنود غير المفوترة للمستأجر"""
    try:
        month = request.args.get('month', datetime.now().strftime('%Y-%m'))
        
        # عدد أوامر العمل المكتملة غير المفوترة
        work_orders_count = work_orders_collection.count_documents({
            'tenant_id': tenant_id,
            'month': month,
            'status': 'completed',
            '$or': [{'billed': {'$exists': False}}, {'billed': False}]
        })
        
        # عدد المخالفات المؤكدة غير المفوترة
        violations_count = violations_collection.count_documents({
            'tenant_id': tenant_id,
            'status': 'confirmed',
            '$or': [{'billed': {'$exists': False}}, {'billed': False}]
        })
        
        return jsonify({
            'work_orders': work_orders_count,
            'violations': violations_count,
            'total': work_orders_count + violations_count
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على عدد البنود المعلقة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/work-orders/<work_order_id>/chat', methods=['GET'])
@jwt_required()
def get_work_order_chat(work_order_id):
    """الحصول على رسائل الدردشة لأمر عمل"""
    try:
        messages = list(chat_messages_collection.find({'work_order_id': work_order_id}).sort('created_at', 1))
        for m in messages:
            m['_id'] = str(m['_id'])
            if isinstance(m['created_at'], datetime):
                m['created_at'] = m['created_at'].isoformat()
        return jsonify({'messages': messages}), 200
    except Exception as e:
        logger.error(f"Error fetching work order chat: {e}")
        return jsonify({'error': 'Failed to fetch messages'}), 500

@app.route('/api/work-orders/<work_order_id>/chat', methods=['POST'])
@jwt_required()
def post_work_order_chat(work_order_id):
    """إرسال رسالة دردشة لأمر عمل"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # التحقق من وجود أمر العمل
        work_order = work_orders_collection.find_one({'_id': work_order_id})
        if not work_order:
            return jsonify({'error': 'أمر العمل غير موجود'}), 404
            
        message = {
            'work_order_id': work_order_id,
            'sender_id': current_user_id,
            'text': data.get('text', ''),
            'created_at': datetime.now()
        }
        
        chat_messages_collection.insert_one(message)
        return jsonify({'message': 'Message sent successfully'}), 201
    except Exception as e:
        logger.error(f"Error sending work order chat: {e}")
        return jsonify({'error': 'Failed to send message'}), 500

@app.route('/api/work-orders/<work_order_id>/attachments', methods=['GET'])
@jwt_required()
def get_work_order_attachments(work_order_id):
    """الحصول على مرفقات أمر عمل"""
    try:
        attachments = list(file_attachments_collection.find({
            'reference_type': 'work_order',
            'reference_id': work_order_id
        }))
        
        for att in attachments:
            att['id'] = att['_id']
            del att['_id']
        
        return jsonify({'attachments': attachments}), 200
    except Exception as e:
        logger.error(f"Error fetching work order attachments: {e}")
        return jsonify({'error': 'Failed to fetch attachments'}), 500

@app.route('/api/work-orders/<work_order_id>', methods=['PUT'])
@jwt_required()
def update_work_order(work_order_id):
    """تحديث أمر عمل"""
    try:
        data = request.get_json()
        
        work_order = work_orders_collection.find_one({'_id': work_order_id})
        if not work_order:
            return jsonify({'error': 'أمر العمل غير موجود'}), 404
        
        update_data = {'updated_at': datetime.now().isoformat()}
        
        allowed_fields = [
            'status', 'cost', 'notes', 'assigned_to', 
            'phone', 'authorization', 'received_by', 'permission_mode',
            'appointment_date', 'appointment_time', 'executed_by',
            'executed_works', 'comments', 'client_approval'
        ]
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if data.get('status') == 'in_progress':
            update_data['started_at'] = datetime.now().isoformat()
        elif data.get('status') == 'completed':
            update_data['completed_at'] = datetime.now().isoformat()
        
        work_orders_collection.update_one({'_id': work_order_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث أمر العمل بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث أمر العمل: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# إدارة الفواتير - Invoices Management
# ===========================================

@app.route('/api/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    """الحصول على جميع الفواتير"""
    try:
        status = request.args.get('status')
        tenant_id = request.args.get('tenant_id')
        
        query = {}
        if status:
            query['status'] = status
        if tenant_id:
            query['tenant_id'] = tenant_id
        
        invoices = list(invoices_collection.find(query))
        
        for invoice in invoices:
            if '_id' in invoice:
                invoice['id'] = invoice['_id']
                del invoice['_id']
        
        return jsonify({
            'invoices': invoices,
            'total': len(invoices)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الفواتير: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/invoices', methods=['POST'])
@jwt_required()
def create_invoice():
    """إنشاء فاتورة جديدة"""
    try:
        data = request.get_json()
        
        required_fields = ['tenant_id', 'contract_id', 'amount', 'due_date']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        invoice = {
            '_id': f"invoice_{datetime.now().timestamp()}",
            'invoice_number': f"INV{int(datetime.now().timestamp())}",
            'tenant_id': data['tenant_id'],
            'contract_id': data['contract_id'],
            'amount': float(data['amount']),
            'tax_amount': float(data.get('tax_amount', 0)),
            'total_amount': float(data['amount']) + float(data.get('tax_amount', 0)),
            'due_date': data['due_date'],
            'status': 'pending',
            'type': data.get('type', 'rent'),
            'description': data.get('description', ''),
            'items': data.get('items', []),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        invoices_collection.insert_one(invoice)
        
        return jsonify({
            'message': 'تم إنشاء الفاتورة بنجاح',
            'invoice': invoice
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء الفاتورة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/invoices/<invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice(invoice_id):
    """الحصول على بيانات فاتورة محددة"""
    try:
        invoice = invoices_collection.find_one({'_id': invoice_id})
        if not invoice:
            return jsonify({'error': 'الفاتورة غير موجودة'}), 404
            
        invoice['id'] = invoice['_id']
        del invoice['_id']
        
        return jsonify({'invoice': invoice}), 200
    except Exception as e:
        logger.error(f"خطأ في الحصول على الفاتورة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/invoices/<invoice_id>', methods=['PUT'])
@jwt_required()
def update_invoice(invoice_id):
    """تحديث بيانات فاتورة"""
    try:
        data = request.get_json()
        invoice = invoices_collection.find_one({'_id': invoice_id})
        if not invoice:
            return jsonify({'error': 'الفاتورة غير موجودة'}), 404
            
        update_data = {
            'updated_at': datetime.now().isoformat()
        }
        
        # الحقول القابلة للتحديث
        fields = ['amount', 'tax_amount', 'total_amount', 'due_date', 'status', 'description', 'items', 'type']
        for field in fields:
            if field in data:
                update_data[field] = data[field]
                
        # إعادة حساب الإجمالي إذا تم تغيير المبلغ أو الضريبة
        if 'amount' in data or 'tax_amount' in data:
            amount = float(update_data.get('amount', invoice.get('amount', 0)))
            tax_amount = float(update_data.get('tax_amount', invoice.get('tax_amount', 0)))
            update_data['total_amount'] = amount + tax_amount
            
        invoices_collection.update_one({'_id': invoice_id}, {'$set': update_data})
        
        updated_invoice = invoices_collection.find_one({'_id': invoice_id})
        updated_invoice['id'] = updated_invoice['_id']
        del updated_invoice['_id']
        
        return jsonify({
            'message': 'تم تحديث الفاتورة بنجاح',
            'invoice': updated_invoice
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث الفاتورة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/invoices/<invoice_id>', methods=['DELETE'])
@jwt_required()
def delete_invoice(invoice_id):
    """حذف فاتورة"""
    try:
        result = invoices_collection.delete_one({'_id': invoice_id})
        if result.deleted_count == 0:
            return jsonify({'error': 'الفاتورة غير موجودة'}), 404
            
        return jsonify({'message': 'تم حذف الفاتورة بنجاح'}), 200
    except Exception as e:
        logger.error(f"خطأ في حذف الفاتورة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# إدارة المدفوعات - Payments Management
# ===========================================

@app.route('/api/payments', methods=['GET'])
@jwt_required()
def get_payments():
    """الحصول على جميع المدفوعات"""
    try:
        tenant_id = request.args.get('tenant_id')
        invoice_id = request.args.get('invoice_id')
        
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
        if invoice_id:
            query['invoice_id'] = invoice_id
        
        payments = list(payments_collection.find(query))
        
        for payment in payments:
            if '_id' in payment:
                payment['id'] = payment['_id']
                del payment['_id']
        
        return jsonify({
            'payments': payments,
            'total': len(payments)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المدفوعات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/payments', methods=['POST'])
@jwt_required()
def create_payment():
    """تسجيل دفعة جديدة"""
    try:
        data = request.get_json()
        
        required_fields = ['invoice_id', 'tenant_id', 'amount', 'payment_method']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        payment = {
            '_id': f"payment_{datetime.now().timestamp()}",
            'payment_number': f"PAY{int(datetime.now().timestamp())}",
            'invoice_id': data['invoice_id'],
            'tenant_id': data['tenant_id'],
            'amount': float(data['amount']),
            'payment_method': data['payment_method'],
            'payment_date': data.get('payment_date', datetime.now().isoformat()),
            'transaction_id': data.get('transaction_id', ''),
            'notes': data.get('notes', ''),
            'status': 'completed',
            'created_at': datetime.now().isoformat()
        }
        
        payments_collection.insert_one(payment)
        
        # تحديث حالة الفاتورة
        invoice = invoices_collection.find_one({'_id': data['invoice_id']})
        if invoice:
            paid_amount = invoice.get('paid_amount', 0) + float(data['amount'])
            if paid_amount >= invoice['total_amount']:
                invoices_collection.update_one(
                    {'_id': data['invoice_id']},
                    {'$set': {'status': 'paid', 'paid_amount': paid_amount, 'paid_at': datetime.now().isoformat()}}
                )
            else:
                invoices_collection.update_one(
                    {'_id': data['invoice_id']},
                    {'$set': {'status': 'partially_paid', 'paid_amount': paid_amount}}
                )
        
        return jsonify({
            'message': 'تم تسجيل الدفعة بنجاح',
            'payment': payment
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في تسجيل الدفعة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# التقارير والإحصائيات - Reports & Statistics
# ===========================================

@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """الحصول على إحصائيات لوحة التحكم"""
    try:
        stats = {
            'total_units': units_collection.count_documents({}),
            'available_units': units_collection.count_documents({'status': 'available'}),
            'rented_units': units_collection.count_documents({'status': 'rented'}),
            'total_tenants': tenants_collection.count_documents({}),
            'active_tenants': tenants_collection.count_documents({'status': 'active'}),
            'total_contracts': contracts_collection.count_documents({}),
            'active_contracts': contracts_collection.count_documents({'status': 'active'}),
            'pending_maintenance': maintenance_collection.count_documents({'status': 'pending'}),
            'total_invoices': invoices_collection.count_documents({}),
            'pending_invoices': invoices_collection.count_documents({'status': 'pending'}),
            'paid_invoices': invoices_collection.count_documents({'status': 'paid'}),
        }
        
        # إضافة إحصائيات تتبع الزوار والإشغال لليوم
        today = datetime.now().strftime('%Y-%m-%d')
        footfall_today = list(footfall_collection.find({'date': today}))
        occupancy_today = list(occupancy_collection.find({'date': today}))
        
        stats['today_footfall'] = sum(r.get('count', 0) for r in footfall_today)
        stats['today_avg_occupancy'] = round(sum(r.get('occupancy_rate', 0) for r in occupancy_today) / len(occupancy_today), 1) if occupancy_today else 0
        
        # حساب المبالغ المالية
        total_revenue = 0
        pending_amount = 0
        
        for invoice in invoices_collection.find():
            total_revenue += invoice.get('total_amount', 0)
            if invoice.get('status') == 'pending':
                pending_amount += invoice.get('total_amount', 0) - invoice.get('paid_amount', 0)
        
        stats['total_revenue'] = total_revenue
        stats['pending_payments'] = pending_amount
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الإحصائيات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/reports/occupancy', methods=['GET'])
@jwt_required()
def get_occupancy_report():
    """تقرير معدل الإشغال"""
    try:
        total_units = units_collection.count_documents({})
        rented_units = units_collection.count_documents({'status': 'rented'})
        
        occupancy_rate = (rented_units / total_units * 100) if total_units > 0 else 0
        
        report = {
            'total_units': total_units,
            'rented_units': rented_units,
            'available_units': total_units - rented_units,
            'occupancy_rate': round(occupancy_rate, 2),
            'generated_at': datetime.now().isoformat()
        }
        
        return jsonify(report), 200
        
    except Exception as e:
        logger.error(f"خطأ في تقرير الإشغال: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/reports/revenue', methods=['GET'])
@jwt_required()
def get_revenue_report():
    """تقرير الإيرادات"""
    try:
        period = request.args.get('period', 'monthly')
        
        total_revenue = 0
        paid_revenue = 0
        pending_revenue = 0
        
        for invoice in invoices_collection.find():
            total_revenue += invoice.get('total_amount', 0)
            if invoice.get('status') == 'paid':
                paid_revenue += invoice.get('total_amount', 0)
            else:
                pending_revenue += invoice.get('total_amount', 0) - invoice.get('paid_amount', 0)
        
        report = {
            'period': period,
            'total_revenue': total_revenue,
            'paid_revenue': paid_revenue,
            'pending_revenue': pending_revenue,
            'collection_rate': round((paid_revenue / total_revenue * 100) if total_revenue > 0 else 0, 2),
            'generated_at': datetime.now().isoformat()
        }
        
        return jsonify(report), 200
        
    except Exception as e:
        logger.error(f"خطأ في تقرير الإيرادات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500



# ===========================================
# معالج الأخطاء - Error Handlers
# ===========================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'المسار غير موجود'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'خطأ في الخادم'}), 500

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'غير مصرح'}), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'ممنوع'}), 403

# ===========================================
# تهيئة البيانات الأولية - Initialize Data
# ===========================================

def initialize_default_data():
    """تهيئة البيانات الافتراضية"""
    try:
        # إنشاء مستخدم مسؤول افتراضي
        if users_collection.count_documents({}) == 0:
            admin_user = {
                '_id': 'admin_default',
                'email': 'admin@smartmall.com',
                'password': generate_password_hash('admin123'),
                'name': 'مدير النظام',
                'phone': '+966500000000',
                'role': 'admin',
                'status': 'active',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            users_collection.insert_one(admin_user)
            logger.info("✅ تم إنشاء المستخدم المسؤول الافتراضي")
            
    except Exception as e:
        logger.error(f"خطأ في تهيئة البيانات: {e}")

# ===========================================
# إدارة المخالفات - Violations Management
# ===========================================

@app.route('/api/violations', methods=['GET'])
@jwt_required()
def get_violations():
    """الحصول على جميع المخالفات"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        user_role = user.get('role', 'viewer') if user else 'viewer'
        
        status = request.args.get('status')
        tenant_id = request.args.get('tenant_id')
        
        query = {}
        if status:
            query['status'] = status
        if tenant_id:
            query['tenant_id'] = tenant_id
        
        violations = list(violations_collection.find(query))
        
        # Filter based on privacy and role
        filtered_violations = []
        for violation in violations:
            if '_id' in violation:
                violation['id'] = violation['_id']
                del violation['_id']
            
            # Check if user can see private violations
            if violation.get('is_private'):
                visible_roles = violation.get('visible_to_roles', [])
                if user_role in visible_roles or user_role in ['ceo', 'mall_director']:
                    filtered_violations.append(violation)
            else:
                filtered_violations.append(violation)
        
        return jsonify({
            'violations': filtered_violations,
            'total': len(filtered_violations)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المخالفات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/violations', methods=['POST'])
@jwt_required()
def create_violation():
    """إنشاء مخالفة جديدة"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        required_fields = ['tenant_id', 'unit_id', 'type', 'title', 'description', 'amount', 'due_date']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        violation = {
            '_id': f"violation_{datetime.now().timestamp()}",
            'violation_number': f"VIO{int(datetime.now().timestamp())}",
            'tenant_id': data['tenant_id'],
            'unit_id': data['unit_id'],
            'type': data['type'],
            'title': data['title'],
            'description': data['description'],
            'amount': float(data['amount']),
            'due_date': data['due_date'],
            'status': 'pending',
            'is_private': data.get('is_private', True),
            'visible_to_roles': data.get('visible_to_roles', ['ceo', 'mall_director', 'collections']),
            'private_notes': data.get('private_notes', ''),
            'created_by': current_user_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        violations_collection.insert_one(violation)
        
        # Add violation amount to tenant's pending invoices
        invoice = {
            '_id': f"invoice_{datetime.now().timestamp()}",
            'invoice_number': f"INV-VIO{int(datetime.now().timestamp())}",
            'tenant_id': data['tenant_id'],
            'violation_id': violation['_id'],
            'amount': float(data['amount']),
            'tax_amount': 0,
            'total_amount': float(data['amount']),
            'due_date': data['due_date'],
            'status': 'pending',
            'type': 'violation',
            'description': f"مخالفة: {data['title']}",
            'created_at': datetime.now().isoformat()
        }
        invoices_collection.insert_one(invoice)
        
        # Trigger Notification
        trigger_notification(
            role='all',
            title='🚨 مخالفة جديدة',
            message=f"تم تسجيل مخالفة جديدة للوحدة {data['unit_id']}: {data['title']}",
            type='warning',
            link='/violations'
        )
        
        return jsonify({
            'message': 'تم إنشاء المخالفة بنجاح',
            'violation': violation
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء المخالفة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/violations/<violation_id>/block', methods=['POST'])
@jwt_required()
def block_unit_for_violation(violation_id):
    """تنفيذ البلوك على وحدة بسبب مخالفة"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        user_role = user.get('role', 'viewer') if user else 'viewer'
        
        # Check permission
        user_permissions = ROLE_PERMISSIONS.get(user_role, [])
        if 'block_units' not in user_permissions and user_role not in ['ceo', 'mall_director', 'collections']:
            return jsonify({'error': 'ليس لديك صلاحية تنفيذ البلوك'}), 403
        
        violation = violations_collection.find_one({'_id': violation_id})
        if not violation:
            return jsonify({'error': 'المخالفة غير موجودة'}), 404
        
        data = request.get_json() or {}
        
        # Update violation status
        violations_collection.update_one(
            {'_id': violation_id},
            {'$set': {
                'status': 'blocked',
                'blocked_at': datetime.now().isoformat(),
                'blocked_by': current_user_id,
                'block_reason': data.get('reason', 'مخالفة غير مدفوعة'),
                'block_services': data.get('block_services', True),
                'block_permits': data.get('block_permits', True),
                'updated_at': datetime.now().isoformat()
            }}
        )
        
        # Update unit status
        units_collection.update_one(
            {'_id': violation['unit_id']},
            {'$set': {
                'is_blocked': True,
                'block_reason': f"مخالفة رقم {violation['violation_number']}",
                'blocked_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }}
        )
        
        # Trigger Notification
        trigger_notification(
            role='all',
            title='🚫 تم حظر وحدة',
            message=f"تم حظر الوحدة {violation['unit_id']} بسبب مخالفة غير مدفوعة",
            type='urgent',
            link='/units'
        )
        
        return jsonify({'message': 'تم تنفيذ البلوك بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تنفيذ البلوك: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/violations/<violation_id>/pay', methods=['POST'])
@jwt_required()
def pay_violation(violation_id):
    """تسجيل دفع المخالفة"""
    try:
        violation = violations_collection.find_one({'_id': violation_id})
        if not violation:
            return jsonify({'error': 'المخالفة غير موجودة'}), 404
        
        # Update violation status
        violations_collection.update_one(
            {'_id': violation_id},
            {'$set': {
                'status': 'paid',
                'paid_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }}
        )
        
        # Update related invoice
        invoices_collection.update_one(
            {'violation_id': violation_id},
            {'$set': {
                'status': 'paid',
                'paid_at': datetime.now().isoformat()
            }}
        )
        
        # Remove block if exists
        if violation.get('status') == 'blocked':
            units_collection.update_one(
                {'_id': violation['unit_id']},
                {'$set': {
                    'is_blocked': False,
                    'block_reason': None,
                    'updated_at': datetime.now().isoformat()
                }}
            )
        
        return jsonify({'message': 'تم تسجيل الدفع بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تسجيل الدفع: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/violations/<violation_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_violation(violation_id):
    """تأكيد المخالفة"""
    try:
        violations_collection.update_one(
            {'_id': violation_id},
            {'$set': {
                'status': 'confirmed',
                'confirmed_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }}
        )
        
        return jsonify({'message': 'تم تأكيد المخالفة'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تأكيد المخالفة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# نظام الإشعارات - Notification System
# ===========================================

def trigger_notification(user_id=None, role=None, title='', message='', type='info', link=None):
    """
    إنشاء إشعار جديد لمستخدم محدد أو لدور وظيفي كامل
    """
    try:
        notification = {
            '_id': f"notif_{datetime.now().timestamp()}_{random.randint(1000, 9999)}",
            'user_id': user_id,
            'role': role,
            'title': title,
            'message': message,
            'type': type, # info, success, warning, error, urgent
            'link': link,
            'is_read': False,
            'read_by': [], # list of user_ids who read it (for role-based)
            'created_at': datetime.now().isoformat()
        }
        notifications_collection.insert_one(notification)
        return True
    except Exception as e:
        logger.error(f"Error triggering notification: {e}")
        return False

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """الحصول على جميع الإشعارات الخاصة بالمستخدم أو بدوره"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        user_role = user.get('role', 'viewer') if user else 'viewer'
        
        # Query notifications that are for this user specifically or for their role
        query = {
            '$or': [
                {'user_id': current_user_id},
                {'role': user_role},
                {'role': 'all'}
            ]
        }
        
        notifications = list(notifications_collection.find(query).sort('created_at', -1).limit(50))
        
        # Metadata for frontend
        unread_count = 0
        
        for n in notifications:
            if '_id' in n:
                n['id'] = n['_id']
                del n['_id']
            
            # Check if read
            if n.get('user_id'):
                # personal notification
                n['is_read'] = n.get('is_read', False)
            else:
                # role-based notification
                n['is_read'] = current_user_id in n.get('read_by', [])
            
            if not n['is_read']:
                unread_count += 1
                
        return jsonify({
            'notifications': notifications,
            'unread_count': unread_count
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/notifications/<notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notif_id):
    """تمييز إشعار كـ مقروء"""
    try:
        current_user_id = get_jwt_identity()
        notification = notifications_collection.find_one({'_id': notif_id})
        
        if not notification:
            return jsonify({'error': 'الإشعار غير موجود'}), 404
        
        if notification.get('user_id'):
            # personal one
            notifications_collection.update_one({'_id': notif_id}, {'$set': {'is_read': True}})
        else:
            # role-based
            notifications_collection.update_one(
                {'_id': notif_id}, 
                {'$addToSet': {'read_by': current_user_id}}
            )
            
        return jsonify({'message': 'تم التحديث'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    """تمييز جميع الإشعارات كـ مقروءة"""
    try:
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        user_role = user.get('role', 'viewer') if user else 'viewer'
        
        # Mark personal ones
        notifications_collection.update_many(
            {'user_id': current_user_id, 'is_read': False},
            {'$set': {'is_read': True}}
        )
        
        # Mark role-based ones
        notifications_collection.update_many(
            {'$or': [{'role': user_role}, {'role': 'all'}], 'read_by': {'$ne': current_user_id}},
            {'$addToSet': {'read_by': current_user_id}}
        )
        
        return jsonify({'message': 'تم تمييز الكل كمقروء'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===========================================
# بوابة المول - Mall Portal Management
# ===========================================

def get_portal_items(collection):
    try:
        items = list(collection.find().sort('created_at', -1))
        for item in items:
            if '_id' in item:
                item['id'] = item['_id']
                del item['_id']
        return items
    except Exception as e:
        logger.error(f"Error fetching portal items: {e}")
        return []

@app.route('/api/portal/news', methods=['GET', 'POST'])
@jwt_required()
def handle_portal_news():
    if request.method == 'GET':
        return jsonify({'items': get_portal_items(portal_news_collection)}), 200
    
    # POST
    try:
        data = request.get_json()
        item = {
            '_id': f"news_{datetime.now().timestamp()}",
            'title': data['title'],
            'description': data['description'],
            'is_urgent': data.get('is_urgent', False),
            'created_at': datetime.now().isoformat()
        }
        portal_news_collection.insert_one(item)
        item['id'] = item['_id']
        del item['_id']
        
        # Trigger Notification
        trigger_notification(
            role='all',
            title='📢 خبر جديد' if not item.get('is_urgent') else '🚨 تنبيه عاجل',
            message=item['title'],
            type='info' if not item.get('is_urgent') else 'urgent',
            link='/portal'
        )
        
        return jsonify({'message': 'تمت الإضافة بنجاح', 'item': item}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/portal/events', methods=['GET', 'POST'])
@jwt_required()
def handle_portal_events():
    if request.method == 'GET':
        return jsonify({'items': get_portal_items(portal_events_collection)}), 200
    
    try:
        data = request.get_json()
        item = {
            '_id': f"event_{datetime.now().timestamp()}",
            'title': data['title'],
            'description': data['description'],
            'start_date': data['start_date'],
            'end_date': data.get('end_date'),
            'location': data['location'],
            'image': data.get('image', '🎉'),
            'created_at': datetime.now().isoformat()
        }
        portal_events_collection.insert_one(item)
        item['id'] = item['_id']
        del item['_id']
        return jsonify({'message': 'تمت الإضافة بنجاح', 'item': item}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/portal/offers', methods=['GET', 'POST'])
@jwt_required()
def handle_portal_offers():
    if request.method == 'GET':
        return jsonify({'items': get_portal_items(portal_offers_collection)}), 200
    
    try:
        data = request.get_json()
        item = {
            '_id': f"offer_{datetime.now().timestamp()}",
            'shop_name': data['shop_name'],
            'title': data['title'],
            'description': data['description'],
            'discount': data['discount_percent'],
            'valid_until': data['end_date'],
            'category': data.get('category', 'shop'),
            'created_at': datetime.now().isoformat()
        }
        portal_offers_collection.insert_one(item)
        item['id'] = item['_id']
        del item['_id']
        return jsonify({'message': 'تمت الإضافة بنجاح', 'item': item}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/portal/shops', methods=['GET', 'POST'])
@jwt_required()
def handle_portal_shops():
    if request.method == 'GET':
        return jsonify({'items': get_portal_items(portal_shops_collection)}), 200
    
    try:
        data = request.get_json()
        item = {
            '_id': f"shop_{datetime.now().timestamp()}",
            'name': data['title'],
            'description': data['description'],
            'category': data.get('category', 'shop'),
            'floor': data.get('floor', 'الطابق الأرضي'),
            'unit': data.get('unit', '-'),
            'rating': 5.0,
            'image': data.get('image', '🛍️'),
            'created_at': datetime.now().isoformat()
        }
        portal_shops_collection.insert_one(item)
        item['id'] = item['_id']
        del item['_id']
        return jsonify({'message': 'تمت الإضافة بنجاح', 'item': item}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/portal/manuals', methods=['GET', 'POST'])
@jwt_required()
def handle_portal_manuals():
    if request.method == 'GET':
        return jsonify({'items': get_portal_items(portal_manuals_collection)}), 200
    
    try:
        data = request.get_json()
        item = {
            '_id': f"manual_{datetime.now().timestamp()}",
            'title': data['title'],
            'description': data['description'],
            'file_type': 'PDF',
            'size': 'N/A',
            'created_at': datetime.now().isoformat()
        }
        portal_manuals_collection.insert_one(item)
        item['id'] = item['_id']
        del item['_id']
        return jsonify({'message': 'تمت الإضافة بنجاح', 'item': item}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===========================================
# إدارة التصاريح - Permits Management
# ===========================================

@app.route('/api/permits', methods=['GET'])
@jwt_required()
def get_permits():
    """الحصول على جميع التصاريح"""
    try:
        status = request.args.get('status')
        permit_type = request.args.get('permit_type')
        tenant_id = request.args.get('tenant_id')
        
        query = {}
        if status:
            query['status'] = status
        if permit_type:
            query['permit_type'] = permit_type
        if tenant_id:
            query['tenant_id'] = tenant_id
        
        permits = list(permits_collection.find(query).sort('created_at', -1))
        
        for permit in permits:
            permit['id'] = permit['_id']
            del permit['_id']
        
        return jsonify({
            'permits': permits,
            'total': len(permits)
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على التصاريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits', methods=['POST'])
@jwt_required()
def create_permit():
    """إنشاء طلب تصريح جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Make only essential fields required - dates can be optional
        required_fields = ['title', 'permit_type']
        if not all(field in data and data[field] for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال العنوان ونوع التصريح على الأقل'}), 400
        
        permit = {
            '_id': f"permit_{datetime.now().timestamp()}",
            'permit_number': f"PRM{int(datetime.now().timestamp())}",
            'tenant_id': data.get('tenant_id', ''),
            'unit_id': data.get('unit_id', ''),
            
            # Permit Details
            'title': data['title'],
            'description': data.get('description', ''),
            
            # Permit Type
            'permit_type': data['permit_type'],  # construction, material_entry, material_exit, equipment, furniture, other
            'work_type': data.get('work_type', 'general'),  # renovation, new_installation, maintenance, delivery, removal
            
            # Direction (for material/equipment)
            'direction': data.get('direction', 'entry'),  # entry, exit, both
            
            # Schedule (optional with defaults)
            'start_date': data.get('start_date', datetime.now().isoformat()),
            'end_date': data.get('end_date', (datetime.now() + timedelta(days=7)).isoformat()),
            'work_schedule': data.get('work_schedule', 'day'),  # day, night, both
            'day_hours': data.get('day_hours', '09:00-18:00'),
            'night_hours': data.get('night_hours', '22:00-06:00'),
            
            # Location
            'location': data.get('location', {
                'floor': '',
                'zone': '',
                'entrance': ''
            }),
            
            # Workers/Vehicles
            'workers': data.get('workers', []),
            'vehicles': data.get('vehicles', []),
            
            # Materials/Equipment
            'items': data.get('items', []),
            
            # Status
            'status': 'pending',
            'reviewed_by': None,
            'reviewed_at': None,
            'approved_by': None,
            'approved_at': None,
            'rejection_reason': None,
            
            # Multi-approval tracking
            'approvals': {},  # {'مدير الأمن': {'approved': True, 'by': 'user_id', 'at': 'timestamp'}, ...}
            'required_approvals': [],  # Will be populated based on permit_type
            
            # Notes
            'notes': data.get('notes', ''),
            'admin_notes': '',
            
            # Metadata
            'created_by': current_user_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.insert_one(permit)
        
        permit['id'] = permit['_id']
        del permit['_id']
        
        return jsonify({
            'message': 'تم إنشاء طلب التصريح بنجاح',
            'permit': permit
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>', methods=['GET'])
@jwt_required()
def get_permit(permit_id):
    """الحصول على تفاصيل تصريح"""
    try:
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        permit['id'] = permit['_id']
        del permit['_id']
        
        # Get attachments
        attachments = list(file_attachments_collection.find({
            'reference_type': 'permit',
            'reference_id': permit_id
        }))
        for att in attachments:
            att['id'] = att['_id']
            del att['_id']
        permit['attachments'] = attachments
        
        return jsonify(permit), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>', methods=['PUT'])
@jwt_required()
def update_permit(permit_id):
    """تحديث تصريح"""
    try:
        data = request.get_json()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        update_data = {'updated_at': datetime.now().isoformat()}
        
        allowed_fields = [
            'title', 'description', 'permit_type', 'work_type', 'direction',
            'start_date', 'end_date', 'work_schedule', 'day_hours', 'night_hours',
            'location', 'workers', 'vehicles', 'items', 'notes'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث التصريح بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>', methods=['DELETE'])
@jwt_required()
def delete_permit(permit_id):
    """حذف تصريح"""
    try:
        result = permits_collection.delete_one({'_id': permit_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        # Delete associated attachments
        file_attachments_collection.delete_many({
            'reference_type': 'permit',
            'reference_id': permit_id
        })
        
        return jsonify({'message': 'تم حذف التصريح بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في حذف التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/review', methods=['PUT'])
@jwt_required()
def review_permit(permit_id):
    """بدء مراجعة التصريح"""
    try:
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        update_data = {
            'status': 'under_review',
            'reviewed_by': current_user_id,
            'reviewed_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم بدء مراجعة التصريح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في مراجعة التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/manager-approve', methods=['PUT'])
@jwt_required()
def manager_approve_permit(permit_id):
    """موافقة مدير محدد على التصريح"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        manager_role = data.get('manager_role')  # e.g., 'مدير الأمن', 'مدير الصيانة'
        if not manager_role:
            return jsonify({'error': 'الرجاء تحديد دور المدير'}), 400
        
        # Get current approvals
        approvals = permit.get('approvals', {})
        
        # Add this manager's approval
        approvals[manager_role] = {
            'approved': True,
            'by': current_user_id,
            'at': datetime.now().isoformat()
        }
        
        update_data = {
            'approvals': approvals,
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        return jsonify({
            'message': f'تمت موافقة {manager_role}',
            'approvals': approvals
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في موافقة المدير: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/approve', methods=['PUT'])
@jwt_required()
def approve_permit(permit_id):
    """الموافقة على التصريح"""
    try:
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        update_data = {
            'status': 'approved',
            'approved_by': current_user_id,
            'approved_at': datetime.now().isoformat(),
            'admin_notes': data.get('admin_notes', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        # Send notification to tenant
        if permit.get('tenant_id'):
            notification = {
                '_id': f"notif_{datetime.now().timestamp()}",
                'user_id': permit.get('tenant_id'),
                'title': 'تم اعتماد التصريح',
                'message': f'تمت الموافقة على التصريح "{permit.get("title")}"',
                'type': 'permit_approved',
                'reference_id': permit_id,
                'read': False,
                'created_at': datetime.now().isoformat()
            }
            notifications_collection.insert_one(notification)
        
        return jsonify({'message': 'تم اعتماد التصريح بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في اعتماد التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/reject', methods=['PUT'])
@jwt_required()
def reject_permit(permit_id):
    """رفض التصريح"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        rejection_reason = data.get('rejection_reason', 'لم يتم تحديد السبب')
        
        update_data = {
            'status': 'rejected',
            'rejected_by': current_user_id,
            'rejected_at': datetime.now().isoformat(),
            'rejection_reason': rejection_reason,
            'admin_notes': data.get('admin_notes', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        # Send notification to tenant
        if permit.get('tenant_id'):
            notification = {
                '_id': f"notif_{datetime.now().timestamp()}",
                'user_id': permit.get('tenant_id'),
                'title': 'تم رفض التصريح',
                'message': f'تم رفض التصريح "{permit.get("title")}". السبب: {rejection_reason}',
                'type': 'permit_rejected',
                'reference_id': permit_id,
                'read': False,
                'created_at': datetime.now().isoformat()
            }
            notifications_collection.insert_one(notification)
        
        return jsonify({'message': 'تم رفض التصريح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في رفض التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/extend', methods=['PUT'])
@jwt_required()
def extend_permit(permit_id):
    """تمديد صلاحية التصريح"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        new_end_date = data.get('new_end_date')
        if not new_end_date:
            return jsonify({'error': 'الرجاء تحديد تاريخ الانتهاء الجديد'}), 400
        
        update_data = {
            'end_date': new_end_date,
            'extended_by': current_user_id,
            'extended_at': datetime.now().isoformat(),
            'extension_reason': data.get('extension_reason', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تمديد التصريح بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تمديد التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/complete', methods=['PUT'])
@jwt_required()
def complete_permit(permit_id):
    """إكمال التصريح (انتهاء العمل)"""
    try:
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        update_data = {
            'status': 'completed',
            'completed_by': current_user_id,
            'completed_at': datetime.now().isoformat(),
            'completion_notes': data.get('completion_notes', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم إكمال التصريح بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في إكمال التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>/attachments', methods=['GET'])
@jwt_required()
def get_permit_attachments(permit_id):
    """الحصول على مرفقات التصريح"""
    try:
        attachments = list(file_attachments_collection.find({
            'reference_type': 'permit',
            'reference_id': permit_id
        }))
        
        for att in attachments:
            att['id'] = att['_id']
            del att['_id']
        
        return jsonify({'attachments': attachments}), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على المرفقات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/stats', methods=['GET'])
@jwt_required()
def get_permits_stats():
    """الحصول على إحصائيات التصاريح"""
    try:
        stats = {
            'total': permits_collection.count_documents({}),
            'pending': permits_collection.count_documents({'status': 'pending'}),
            'under_review': permits_collection.count_documents({'status': 'under_review'}),
            'approved': permits_collection.count_documents({'status': 'approved'}),
            'rejected': permits_collection.count_documents({'status': 'rejected'}),
            'completed': permits_collection.count_documents({'status': 'completed'}),
            'by_type': {
                'construction': permits_collection.count_documents({'permit_type': 'construction'}),
                'material_entry': permits_collection.count_documents({'permit_type': 'material_entry'}),
                'material_exit': permits_collection.count_documents({'permit_type': 'material_exit'}),
                'equipment': permits_collection.count_documents({'permit_type': 'equipment'}),
                'furniture': permits_collection.count_documents({'permit_type': 'furniture'}),
                'other': permits_collection.count_documents({'permit_type': 'other'})
            }
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"خطأ في الحصول على الإحصائيات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/gates', methods=['GET'])
@jwt_required()
@check_permission('view_footfall')
def get_gates():
    """الحصول على قائمة البوابات"""
    try:
        gates = list(gates_collection.find({}, {'_id': 0}))
        return jsonify({'gates': gates}), 200
    except Exception as e:
        logger.error(f"خطأ في الحصول على البوابات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/gates', methods=['POST'])
@jwt_required()
@check_permission('manage_footfall')
def add_gate():
    """إضافة بوابة جديدة"""
    try:
        data = request.get_json()
        if not data.get('name'):
            return jsonify({'error': 'اسم البوابة مطلوب'}), 400
            
        gate = {
            'id': f"gate_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'name': data['name'],
            'location': data.get('location', ''),
            'created_at': datetime.now().isoformat()
        }
        gates_collection.insert_one(gate)
        del gate['_id']
        return jsonify({'message': 'تم إضافة البوابة بنجاح', 'gate': gate}), 201
    except Exception as e:
        logger.error(f"خطأ في إضافة البوابة: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/restaurants', methods=['GET'])
@jwt_required()
@check_permission('view_footfall')
def get_restaurants():
    """الحصول على قائمة المطاعم المخصصة لتتبع الإشغال"""
    try:
        restaurants = list(restaurants_collection.find({}, {'_id': 0}))
        return jsonify({'restaurants': restaurants}), 200
    except Exception as e:
        logger.error(f"خطأ في الحصول على المطاعم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/restaurants', methods=['POST'])
@jwt_required()
@check_permission('manage_footfall')
def add_restaurant():
    """إضافة مطعم لتتبع الإشغال"""
    try:
        data = request.get_json()
        if not data.get('name'):
            return jsonify({'error': 'اسم المطعم مطلوب'}), 400
            
        restaurant = {
            'id': f"rest_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'name': data['name'],
            'unit_number': data.get('unit_number', ''),
            'capacity': data.get('capacity', 0),
            'created_at': datetime.now().isoformat()
        }
        restaurants_collection.insert_one(restaurant)
        del restaurant['_id']
        return jsonify({'message': 'تم إضافة المطعم بنجاح', 'restaurant': restaurant}), 201
    except Exception as e:
        logger.error(f"خطأ في إضافة المطعم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/footfall', methods=['POST'])
@jwt_required()
@check_permission('manage_footfall')
def submit_footfall():
    """إدخال بيانات البوابات (التشغيل فقط)"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        shift = data.get('shift')  # morning, evening
        gate_entries = data.get('entries', []) # [{'gate_id': 'xxx', 'count': 100}, ...]
        
        if not shift or not gate_entries:
            return jsonify({'error': 'البيانات ناقصة'}), 400
            
        records = []
        for entry in gate_entries:
            record = {
                'date': date,
                'shift': shift,
                'gate_id': entry['gate_id'],
                'gate_name': entry.get('gate_name', ''),
                'count': int(entry.get('count', 0)),
                'entered_by': current_user_id,
                'created_at': datetime.now().isoformat()
            }
            # Upsert record for same date, shift, and gate
            footfall_collection.update_one(
                {'date': date, 'shift': shift, 'gate_id': entry['gate_id']},
                {'$set': record},
                upsert=True
            )
            records.append(record)
            
        return jsonify({'message': 'تم حفظ بيانات البوابات بنجاح'}), 201
    except Exception as e:
        logger.error(f"خطأ في إدخال بيانات البوابات: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/occupancy', methods=['POST'])
@jwt_required()
@check_permission('manage_footfall')
def submit_occupancy():
    """إدخال نسب إشغال المطاعم (التشغيل فقط)"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        shift = data.get('shift')  # morning, evening
        rest_entries = data.get('entries', []) # [{'restaurant_id': 'xxx', 'occupancy_rate': 85.5}, ...]
        
        if not shift or not rest_entries:
            return jsonify({'error': 'البيانات ناقصة'}), 400
            
        for entry in rest_entries:
            record = {
                'date': date,
                'shift': shift,
                'restaurant_id': entry['restaurant_id'],
                'restaurant_name': entry.get('restaurant_name', ''),
                'occupancy_rate': float(entry.get('occupancy_rate', 0)),
                'entered_by': current_user_id,
                'created_at': datetime.now().isoformat()
            }
            # Upsert record for same date, shift, and restaurant
            occupancy_collection.update_one(
                {'date': date, 'shift': shift, 'restaurant_id': entry['restaurant_id']},
                {'$set': record},
                upsert=True
            )
            
        return jsonify({'message': 'تم حفظ نسب الإشغال بنجاح'}), 201
    except Exception as e:
        logger.error(f"خطأ في إدخال نسب الإشغال: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/analytics/footfall-occupancy/daily/<date>', methods=['GET'])
@jwt_required()
@check_permission('view_footfall')
def get_daily_stats(date):
    """الحصول على إحصائيات يوم محدد"""
    try:
        # Footfall stats
        footfall_records = list(footfall_collection.find({'date': date}))
        # Occupancy stats
        occupancy_records = list(occupancy_collection.find({'date': date}))
        
        for r in footfall_records: del r['_id']
        for r in occupancy_records: del r['_id']
        
        return jsonify({
            'date': date,
            'footfall': footfall_records,
            'occupancy': occupancy_records
        }), 200
    except Exception as e:
        logger.error(f"خطأ في الحصول على إحصائيات اليوم: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/analytics/footfall-occupancy/monthly/<year>/<month>', methods=['GET'])
@jwt_required()
@check_permission('view_footfall')
def get_monthly_stats(year, month):
    """الحصول على إحصائيات شهر محدد"""
    try:
        pattern = f"^{year}-{month}-"
        
        # Aggregate Footfall by date
        footfall_pipeline = [
            {'$match': {'date': {'$regex': pattern}}},
            {'$group': {
                '_id': '$date',
                'total_count': {'$sum': '$count'},
                'morning_count': {'$sum': {'$cond': [{'$eq': ['$shift', 'morning']}, '$count', 0]}},
                'evening_count': {'$sum': {'$cond': [{'$eq': ['$shift', 'evening']}, '$count', 0]}}
            }},
            {'$sort': {'_id': 1}}
        ]
        footfall_monthly = list(footfall_collection.aggregate(footfall_pipeline))
        
        # Aggregate Occupancy by date (average)
        occupancy_pipeline = [
            {'$match': {'date': {'$regex': pattern}}},
            {'$group': {
                '_id': '$date',
                'avg_occupancy': {'$avg': '$occupancy_rate'},
                'morning_avg': {'$avg': {'$cond': [{'$eq': ['$shift', 'morning']}, '$occupancy_rate', 0]}},
                'evening_avg': {'$avg': {'$cond': [{'$eq': ['$shift', 'evening']}, '$occupancy_rate', 0]}}
            }},
            {'$sort': {'_id': 1}}
        ]
        occupancy_monthly = list(occupancy_collection.aggregate(occupancy_pipeline))
        
        return jsonify({
            'year': year,
            'month': month,
            'footfall': footfall_monthly,
            'occupancy': occupancy_monthly
        }), 200
    except Exception as e:
        logger.error(f"خطأ في الحصول على إحصائيات الشهر: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/footfall-occupancy/attachments', methods=['GET'])
@jwt_required()
@check_permission('view_footfall')
def get_footfall_attachments():
    """الحصول على المرفقات الخاصة بفترة محددة"""
    try:
        date = request.args.get('date')
        shift = request.args.get('shift')
        if not date or not shift:
            return jsonify({'error': 'التاريخ والفترة مطلوبان'}), 400
            
        attachments = list(file_attachments_collection.find({
            'reference_type': 'footfall',
            'reference_id': f"{date}_{shift}"
        }))
        
        for att in attachments:
            att['id'] = att['_id']
            del att['_id']
            
        return jsonify({'attachments': attachments}), 200
    except Exception as e:
        logger.error(f"خطأ في الحصول على مرفقات الزوار: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

# ===========================================
# تشغيل التطبيق - Run Application
# ===========================================

if __name__ == '__main__':
    # تهيئة البيانات الأولية
    if db is not None:
        initialize_default_data()
    
    # تشغيل التطبيق
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"🚀 تشغيل Smart Mall CRM على المنفذ {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
