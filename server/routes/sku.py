from flask import Blueprint, request, jsonify
from models.product import Product
from db.database import db

sku_bp = Blueprint('sku', __name__)

@sku_bp.route('/sku/generate', methods=['POST'])
def generate_sku():
    data = request.get_json()
    
    required_fields = ['company', 'productName', 'productType', 'specifications']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        # Generate SKU based on company code and specifications
        company = db.companies.find_one({'code': data['company']})
        if not company:
            return jsonify({'error': 'Invalid company code'}), 400
        
        # Generate SKU: COMPANY-PRODUCT_TYPE-SERIAL
        product_type_code = data['productType'].upper()[:3]
        serial_number = str(db.products.count_documents({}) + 1).zfill(4)
        sku = f"{company['short_form']}-{product_type_code}-{serial_number}"
        
        # Check if product already exists
        existing_product = db.products.find_one({'name': data['productName']})
        if existing_product:
            return jsonify({
                'message': 'Product already exists',
                'sku': existing_product.get('sku', 'N/A'),
                'productId': str(existing_product['_id'])
            }), 200
        
        # Create new product
        product_data = {
            'name': data['productName'],
            'category': data['productType'],
            'sku': sku,
            'company': company['name'],
            'companyCode': data['company'],
            'specifications': data['specifications'],
            'stock': 0,
            'imported': True,
            'createdAt': None,
            'lastUpdated': None
        }
        
        result = db.products.insert_one(product_data)
        
        return jsonify({
            'message': 'Product created successfully',
            'sku': sku,
            'productId': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sku_bp.route('/sku/companies', methods=['GET'])
def get_companies():
    try:
        companies = list(db.companies.find({}, {'_id': 0}))
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sku_bp.route('/sku/check-duplicate', methods=['POST'])
def check_duplicate():
    data = request.get_json()
    product_name = data.get('productName')
    
    if not product_name:
        return jsonify({'error': 'Product name is required'}), 400
    
    try:
        existing_product = db.products.find_one({'name': product_name})
        if existing_product:
            return jsonify({
                'exists': True,
                'sku': existing_product.get('sku', 'N/A'),
                'productId': str(existing_product['_id'])
            }), 200
        else:
            return jsonify({'exists': False}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
