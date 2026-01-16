from flask import Blueprint, request, jsonify
from models.product import Product
from db.database import db

sku_bp = Blueprint('sku', __name__)

@sku_bp.route('/sku/generate', methods=['POST'])
def generate_sku():
    data = request.get_json()
    
    required_fields = ['companyShortform', 'brandShortform', 'importedCode', 'specifications']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        # Convert text to numeric (A=1, B=2, etc.)
        def text_to_numeric(text):
            if not text:
                return ''
            result = ''
            for char in text.upper():
                if 'A' <= char <= 'Z':
                    result += str(ord(char) - ord('A') + 1).zfill(2)
                elif char.isdigit():
                    result += char
            return result
        
        company_numeric = text_to_numeric(data['companyShortform'])
        brand_numeric = text_to_numeric(data['brandShortform'])
        
        # Build spec suffix: thickness-length-width-bar(if any)
        specs = data['specifications']
        spec_parts = []
        if specs.get('thickness'):
            spec_parts.append(str(specs['thickness']))
        if specs.get('length'):
            spec_parts.append(str(specs['length']))
        if specs.get('width'):
            spec_parts.append(str(specs['width']))
        if specs.get('barring') == 'yes' and specs.get('barNumber'):
            spec_parts.append(str(specs['barNumber']))
        
        spec_suffix = '-'.join(spec_parts) if spec_parts else '0000'
        
        # Generate SKU: COMPANY_NUMERIC-BRAND_NUMERIC-IMPORTED_CODE-SPEC_SUFFIX
        sku = f"{company_numeric}-{brand_numeric}-{data['importedCode']}-{spec_suffix}"
        
        # Create new product
        product_data = {
            'name': data.get('brandName', ''),
            'category': 'imported',
            'sku': sku,
            'company': data.get('companyName', ''),
            'companyCode': data.get('company', ''),
            'brandShortform': data['brandShortform'],
            'companyShortform': data['companyShortform'],
            'importedCode': data['importedCode'],
            'specifications': data['specifications'],
            'stock': 0,
            'imported': True,
            'createdAt': None,
            'lastUpdated': None
        }
        
        result = db.products.insert_one(product_data)
        
        return jsonify({
            'message': 'SKU generated successfully',
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
