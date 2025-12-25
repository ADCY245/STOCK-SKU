from flask import Blueprint, request, jsonify
from models.product import Product
from models.stock_transaction import StockTransaction
from datetime import datetime
import pandas as pd
import io

stock_bp = Blueprint('stock', __name__)

@stock_bp.route('/stock', methods=['GET'])
def get_stock():
    products = Product.get_all()
    total_stock = sum(p.get('stock', 0) for p in products)
    low_stock = len([p for p in products if p.get('stock', 0) < 10])  # Assuming low stock threshold
    return jsonify({'total': total_stock, 'lowStock': low_stock})

@stock_bp.route('/stock/in', methods=['POST'])
def add_stock():
    data = request.get_json()
    product_id = data.get('productId')
    quantity = data.get('quantity')

    if not product_id or not quantity:
        return jsonify({'error': 'Product ID and quantity are required'}), 400

    product = Product.get_by_id(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    new_stock = product['stock'] + quantity
    Product.update_stock(product_id, new_stock)

    # Record transaction
    transaction = StockTransaction(product_id, quantity, 'in')
    transaction.save()

    return jsonify({'message': 'Stock added successfully'}), 200

@stock_bp.route('/stock/out', methods=['POST'])
def issue_stock():
    data = request.get_json()
    product_id = data.get('productId')
    quantity = data.get('quantity')

    if not product_id or not quantity:
        return jsonify({'error': 'Product ID and quantity are required'}), 400

    product = Product.get_by_id(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    if product['stock'] < quantity:
        return jsonify({'error': 'Insufficient stock'}), 400

    new_stock = product['stock'] - quantity
    Product.update_stock(product_id, new_stock)

    # Record transaction
    transaction = StockTransaction(product_id, quantity, 'out')
    transaction.save()

    return jsonify({'message': 'Stock issued successfully'}), 200

@stock_bp.route('/stock/in/detailed', methods=['POST'])
def add_stock_detailed():
    data = request.get_json()
    
    required_fields = ['productType', 'productName', 'length', 'width', 'thickness', 'rollNumber', 'sqMtr']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    try:
        # Create or find product
        from db.database import db
        
        # Check if product already exists
        existing_product = db.products.find_one({
            'name': data['productName'],
            'category': data['productType']
        })
        
        if not existing_product:
            # Create new product
            product_data = {
                'name': data['productName'],
                'category': data['productType'],
                'stock': 0,
                'imported': True,
                'createdAt': datetime.utcnow()
            }
            product_result = db.products.insert_one(product_data)
            product_id = str(product_result.inserted_id)
        else:
            product_id = str(existing_product['_id'])
        
        # Create detailed stock record
        stock_data = {
            'productType': data['productType'],
            'productName': data['productName'],
            'productId': product_id,
            'length': data['length'],
            'width': data['width'],
            'thickness': data['thickness'],
            'lengthUnit': data.get('lengthUnit', 'mm'),
            'widthUnit': data.get('widthUnit', 'mm'),
            'thicknessUnit': data.get('thicknessUnit', 'mm'),
            'rollNumber': data['rollNumber'],
            'importDate': datetime.strptime(data['importDate'], '%Y-%m-%d') if data.get('importDate') else None,
            'sqMtr': data['sqMtr'],
            'createdAt': datetime.utcnow()
        }
        
        # Insert into detailed stock collection
        from db.database import db
        result = db.detailed_stock.insert_one(stock_data)
        
        # Also update the main product stock
        from models.product import Product
        product = Product.get_by_id(product_id)
        if product:
            new_stock = product['stock'] + data['sqMtr']
            Product.update_stock(product_id, new_stock)
            
            # Record transaction
            transaction = StockTransaction(product_id, data['sqMtr'], 'in')
            transaction.save()
        
        return jsonify({'message': 'Stock added successfully', 'id': str(result.inserted_id)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/stock/upload-excel', methods=['POST'])
def upload_excel():
    try:
        if 'excel-file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['excel-file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'Invalid file format. Please upload Excel file'}), 400
        
        # Read Excel file
        df = pd.read_excel(file)
        
        # Expected columns: productType, productName, length, width, thickness, rollNumber, importDate
        required_columns = ['productType', 'productName', 'length', 'width', 'thickness', 'rollNumber', 'importDate']
        
        for col in required_columns:
            if col not in df.columns:
                return jsonify({'error': f'Missing required column: {col}'}), 400
        
        # Process each row
        from db.database import db
        inserted_count = 0
        
        for index, row in df.iterrows():
            try:
                # Calculate sqMtr
                length_mtr = row['length'] / 1000 if row['length'] > 100 else row['length']
                width_mtr = row['width'] / 1000 if row['width'] > 100 else row['width']
                sq_mtr = round(length_mtr * width_mtr, 2)
                
                # Find product by name and type
                product = db.products.find_one({
                    'name': row['productName'],
                    'category': row['productType']
                })
                
                if product:
                    stock_data = {
                        'productType': row['productType'],
                        'productId': str(product['_id']),
                        'length': row['length'],
                        'width': row['width'],
                        'thickness': row['thickness'],
                        'rollNumber': str(row['rollNumber']),
                        'importDate': pd.to_datetime(row['importDate']).to_pydatetime(),
                        'sqMtr': sq_mtr,
                        'createdAt': datetime.utcnow()
                    }
                    
                    db.detailed_stock.insert_one(stock_data)
                    
                    # Update main product stock
                    new_stock = product.get('stock', 0) + sq_mtr
                    db.products.update_one(
                        {'_id': product['_id']},
                        {'$set': {'stock': new_stock, 'lastUpdated': datetime.utcnow()}}
                    )
                    
                    inserted_count += 1
                    
            except Exception as e:
                print(f"Error processing row {index}: {e}")
                continue
        
        return jsonify({'message': f'Successfully processed {inserted_count} records', 'count': inserted_count}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
