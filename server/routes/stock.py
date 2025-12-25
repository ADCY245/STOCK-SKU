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
    
    required_fields = ['productType', 'productName', 'stockType', 'thickness']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Validate roll number requirement
    if data['productType'] == 'blankets' and data['stockType'] == 'roll':
        if not data.get('rollNumber'):
            return jsonify({'error': 'Roll number is required for blanket rolls'}), 400

    # Validate stock type specific fields
    if data['stockType'] == 'roll':
        if not data.get('length') or not data.get('width') or not data.get('sqMtr'):
            return jsonify({'error': 'Length, width, and sq.mtr are required for roll stock'}), 400
    elif data['stockType'] == 'pieces':
        if not data.get('numberOfPieces'):
            return jsonify({'error': 'Number of pieces is required for cut pieces stock'}), 400

    try:
        # Create or find product
        from db.database import db
        
        # Check if product already exists
        existing_product = db.products.find_one({
            'name': data['productName'],
            'category': data['productType']
        })
        
        if not existing_product:
            # Create new product with dimensions
            dimensions = {}
            if data['stockType'] == 'roll':
                dimensions = {
                    'length': data['length'],
                    'width': data['width'],
                    'lengthUnit': data.get('lengthUnit', 'mm'),
                    'widthUnit': data.get('widthUnit', 'mm'),
                    'thickness': data['thickness'],
                    'thicknessUnit': data.get('thicknessUnit', 'mm')
                }
            elif data['stockType'] == 'pieces':
                dimensions = {
                    'thickness': data['thickness'],
                    'thicknessUnit': data.get('thicknessUnit', 'mm'),
                    'numberOfPieces': data['numberOfPieces']
                }
                
                # For blanket cut pieces, calculate sq.mtr
                if data['productType'] == 'blankets' and data.get('length') and data.get('width'):
                    length_mtr = data['length'] / 1000 if data.get('lengthUnit') == 'mm' else data['length']
                    width_mtr = data['width'] / 1000 if data.get('widthUnit') == 'mm' else data['width']
                    sq_mtr_per_piece = length_mtr * width_mtr
                    total_sq_mtr = data['numberOfPieces'] * sq_mtr_per_piece
                    
                    dimensions.update({
                        'length': data['length'],
                        'width': data['width'],
                        'lengthUnit': data.get('lengthUnit', 'mm'),
                        'widthUnit': data.get('widthUnit', 'mm'),
                        'sqMtrPerPiece': sq_mtr_per_piece,
                        'totalSqMtr': total_sq_mtr
                    })
            
            product_data = {
                'name': data['productName'],
                'category': data['productType'],
                'stock': 0,
                'imported': True,
                'dimensions': dimensions,
                'createdAt': datetime.utcnow()
            }
            product_result = db.products.insert_one(product_data)
            product_id = str(product_result.inserted_id)
        else:
            product_id = str(existing_product['_id'])
            # Update dimensions if they exist and product doesn't have them
            if not existing_product.get('dimensions') and (data['length'] or data['width'] or data['thickness']):
                dimensions = {}
                if data['stockType'] == 'roll':
                    dimensions = {
                        'length': data['length'],
                        'width': data['width'],
                        'lengthUnit': data.get('lengthUnit', 'mm'),
                        'widthUnit': data.get('widthUnit', 'mm'),
                        'thickness': data['thickness'],
                        'thicknessUnit': data.get('thicknessUnit', 'mm')
                    }
                elif data['stockType'] == 'pieces':
                    dimensions = {
                        'thickness': data['thickness'],
                        'thicknessUnit': data.get('thicknessUnit', 'mm'),
                        'numberOfPieces': data['numberOfPieces']
                    }
                    
                    # For blanket cut pieces, calculate sq.mtr
                    if data['productType'] == 'blankets' and data.get('length') and data.get('width'):
                        length_mtr = data['length'] / 1000 if data.get('lengthUnit') == 'mm' else data['length']
                        width_mtr = data['width'] / 1000 if data.get('widthUnit') == 'mm' else data['width']
                        sq_mtr_per_piece = length_mtr * width_mtr
                        total_sq_mtr = data['numberOfPieces'] * sq_mtr_per_piece
                        
                        dimensions.update({
                            'length': data['length'],
                            'width': data['width'],
                            'lengthUnit': data.get('lengthUnit', 'mm'),
                            'widthUnit': data.get('widthUnit', 'mm'),
                            'sqMtrPerPiece': sq_mtr_per_piece,
                            'totalSqMtr': total_sq_mtr
                        })
                Product.update_dimensions(product_id, dimensions)
        
        # Create detailed stock record
        stock_data = {
            'productType': data['productType'],
            'productName': data['productName'],
            'productId': product_id,
            'stockType': data['stockType'],
            'thickness': data['thickness'],
            'thicknessUnit': data.get('thicknessUnit', 'mm'),
            'rollNumber': data.get('rollNumber', None),
            'importDate': datetime.strptime(data['importDate'], '%Y-%m-%d') if data.get('importDate') else None,
            'takenDate': datetime.strptime(data['takenDate'], '%Y-%m-%d') if data.get('takenDate') else None,
            'createdAt': datetime.utcnow()
        }
        
        # Add stock type specific fields
        if data['stockType'] == 'roll':
            stock_data.update({
                'length': data['length'],
                'width': data['width'],
                'lengthUnit': data.get('lengthUnit', 'mm'),
                'widthUnit': data.get('widthUnit', 'mm'),
                'sqMtr': data['sqMtr'],
                'numberOfPieces': None
            })
            stock_quantity = data['sqMtr']
        elif data['stockType'] == 'pieces':
            stock_data.update({
                'length': None,
                'width': None,
                'lengthUnit': None,
                'widthUnit': None,
                'sqMtr': None,
                'numberOfPieces': data['numberOfPieces']
            })
            stock_quantity = data['numberOfPieces']
        
        # Insert into detailed stock collection
        from db.database import db
        result = db.detailed_stock.insert_one(stock_data)
        
        # Also update the main product stock
        from models.product import Product
        product = Product.get_by_id(product_id)
        if product:
            new_stock = product['stock'] + stock_quantity
            Product.update_stock(product_id, new_stock)
            
            # Record transaction
            transaction = StockTransaction(product_id, stock_quantity, 'in')
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
        
        # Expected columns: productType, productName, length, width, thickness, rollNumber, importDate, takenDate
        required_columns = ['productType', 'productName', 'length', 'width', 'thickness', 'rollNumber', 'importDate']
        optional_columns = ['takenDate']
        
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
                        'productName': row['productName'],
                        'length': row['length'],
                        'width': row['width'],
                        'thickness': row['thickness'],
                        'rollNumber': str(row['rollNumber']),
                        'importDate': pd.to_datetime(row['importDate']).to_pydatetime(),
                        'takenDate': pd.to_datetime(row['takenDate']).to_pydatetime() if pd.notna(row.get('takenDate')) else None,
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
