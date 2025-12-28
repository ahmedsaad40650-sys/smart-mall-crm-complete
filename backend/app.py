#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Mall CRM Park St. - التطبيق الرئيسي
نظام إدارة المولات الذكية الاحترافي
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import os
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

# تفعيل CORS
CORS(app, resources={r"/*": {"origins": "*"}})

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

# ===========================================
# Decorators - المساعدات والمصادقات
# ===========================================

def admin_required(fn):
    """التحقق من صلاحيات المسؤول"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = users_collection.find_one({'_id': current_user_id})
        if not user or user.get('role') != 'admin':
            return jsonify({'error': 'غير مصرح لك بالوصول'}), 403
        return fn(*args, **kwargs)
    return wrapper

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

@app.route('/api/auth/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'الرجاء إدخال البريد وكلمة المرور'}), 400
        
        # البحث عن المستخدم
        user = users_collection.find_one({'email': data['email']})
        
        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({'error': 'بيانات الدخول غير صحيحة'}), 401
        
        if user.get('status') != 'active':
            return jsonify({'error': 'الحساب غير نشط'}), 403
        
        # إنشاء التوكن
        access_token = create_access_token(identity=user['_id'])
        
        return jsonify({
            'message': 'تم تسجيل الدخول بنجاح',
            'access_token': access_token,
            'user': {
                'id': user['_id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"خطأ في تسجيل الدخول: {e}")
        return jsonify({'error': 'حدث خطأ في تسجيل الدخول'}), 500

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
        
        required_fields = ['unit_number', 'floor', 'area', 'rental_price']
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
            'rental_price': float(data['rental_price']),
            'type': data.get('type', 'retail'),
            'status': data.get('status', 'available'),
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
        
        allowed_fields = ['unit_number', 'floor', 'area', 'rental_price', 'type', 'status', 'description', 'amenities']
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
        
        allowed_fields = ['name', 'email', 'phone', 'business_name', 'business_type', 'tax_id', 'address', 'status', 'notes']
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
# إدارة التصاريح - Permits Management
# ===========================================

@app.route('/api/permits', methods=['GET'])
@jwt_required()
def get_permits():
    """الحصول على جميع التصاريح"""
    try:
        status = request.args.get('status')
        query = {}
        if status:
            query['status'] = status
        
        permits = list(permits_collection.find(query))
        
        for permit in permits:
            if '_id' in permit:
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
    """إنشاء تصريح جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        required_fields = ['tenant_id', 'permit_type', 'title', 'description']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'الرجاء إدخال جميع البيانات المطلوبة'}), 400
        
        permit = {
            '_id': f"permit_{datetime.now().timestamp()}",
            'permit_number': f"PRM{int(datetime.now().timestamp())}",
            'tenant_id': data['tenant_id'],
            'permit_type': data['permit_type'],
            'title': data['title'],
            'description': data['description'],
            'status': 'pending',
            'requested_by': current_user_id,
            'requested_at': datetime.now().isoformat(),
            'start_date': data.get('start_date', ''),
            'end_date': data.get('end_date', ''),
            'notes': data.get('notes', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        permits_collection.insert_one(permit)
        
        return jsonify({
            'message': 'تم إنشاء التصريح بنجاح',
            'permit': permit
        }), 201
        
    except Exception as e:
        logger.error(f"خطأ في إنشاء التصريح: {e}")
        return jsonify({'error': 'حدث خطأ'}), 500

@app.route('/api/permits/<permit_id>', methods=['PUT'])
@jwt_required()
def update_permit(permit_id):
    """تحديث حالة تصريح"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        permit = permits_collection.find_one({'_id': permit_id})
        if not permit:
            return jsonify({'error': 'التصريح غير موجود'}), 404
        
        update_data = {'updated_at': datetime.now().isoformat()}
        
        if 'status' in data:
            update_data['status'] = data['status']
            if data['status'] in ['approved', 'rejected']:
                update_data['reviewed_by'] = current_user_id
                update_data['reviewed_at'] = datetime.now().isoformat()
                update_data['review_notes'] = data.get('review_notes', '')
        
        permits_collection.update_one({'_id': permit_id}, {'$set': update_data})
        
        return jsonify({'message': 'تم تحديث التصريح بنجاح'}), 200
        
    except Exception as e:
        logger.error(f"خطأ في تحديث التصريح: {e}")
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
