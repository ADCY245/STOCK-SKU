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

    # Common required fields
    base_required = ['productType', 'productName', 'stockType']
    for field in base_required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    product_type = data['productType']
    stock_type = data['stockType']

    # Determine required fields per product type
    type_specific_required = []
    if product_type in ['blankets', 'underpacking']:
        type_specific_required.extend(['thickness'])
        if stock_type == 'roll':
            type_specific_required.extend(['length', 'width', 'sqMtr'])
        elif stock_type == 'pieces':
            type_specific_required.extend(['numberOfPieces'])
    elif product_type == 'litho perf':
        type_specific_required.extend(['lithoPieceType', 'perforationType', 'stock'])
    elif product_type == 'matrix':
        type_specific_required.extend(['matrixFormat', 'matrixSizeWidth', 'matrixSizeHeight', 'stock'])
    elif product_type == 'rules':
        type_specific_required.extend(['ruleFormat', 'rulePackedAs', 'stock'])
    elif product_type == 'chemicals':
        type_specific_required.extend(['productFormat', 'chemicalUnit', 'stock'])

    for field in type_specific_required:
        if data.get(field) in [None, '', []]:
            return jsonify({'error': f'{field} is required'}), 400

    # Blanket roll specific check
    if product_type == 'blankets' and stock_type == 'roll' and not data.get('rollNumber'):
        return jsonify({'error': 'Roll number is required for blanket rolls'}), 400

    # Stock-type validation
    if stock_type == 'roll' and product_type in ['blankets', 'underpacking']:
        if not data.get('length') or not data.get('width') or not data.get('sqMtr'):
            return jsonify({'error': 'Length, width, and sq.mtr are required for roll stock'}), 400
    elif stock_type == 'pieces' and product_type in ['blankets', 'underpacking']:
        if not data.get('numberOfPieces'):
            return jsonify({'error': 'Number of pieces is required for cut pieces stock'}), 400

    try:
        from db.database import db

        blanket_types = ['blankets', 'underpacking']

        def sanitize(payload):
            return {k: v for k, v in payload.items() if v is not None}

        def build_dimensions_payload():
            if product_type in blanket_types:
                if stock_type == 'roll':
                    return sanitize({
                        'stockType': 'roll',
                        'length': data.get('length'),
                        'width': data.get('width'),
                        'lengthUnit': data.get('lengthUnit', 'mm'),
                        'widthUnit': data.get('widthUnit', 'mm'),
                        'thickness': data.get('thickness'),
                        'thicknessUnit': data.get('thicknessUnit', 'mm'),
                        'rollNumber': data.get('rollNumber')
                    })
                elif stock_type == 'pieces':
                    dimensions = {
                        'stockType': 'pieces',
                        'thickness': data.get('thickness'),
                        'thicknessUnit': data.get('thicknessUnit', 'mm'),
                        'numberOfPieces': data.get('numberOfPieces')
                    }
                    if data.get('length') and data.get('width'):
                        dimensions.update({
                            'length': data.get('length'),
                            'width': data.get('width'),
                            'lengthUnit': data.get('lengthUnit', 'mm'),
                            'widthUnit': data.get('widthUnit', 'mm')
                        })
                    return sanitize(dimensions)
            elif product_type == 'litho perf':
                return sanitize({
                    'stockType': 'pieces',
                    'lithoPieceType': data.get('lithoPieceType'),
                    'perforationType': data.get('perforationType'),
                    'productTPI': data.get('productTPI')
                })
            elif product_type == 'matrix':
                return sanitize({
                    'stockType': 'pieces',
                    'matrixFormat': data.get('matrixFormat'),
                    'matrixSizeWidth': data.get('matrixSizeWidth'),
                    'matrixSizeHeight': data.get('matrixSizeHeight'),
                    'stockUnit': 'pkts'
                })
            elif product_type == 'rules':
                stock_unit = 'coils' if data.get('rulePackedAs') == 'coil' else 'pkts'
                return sanitize({
                    'stockType': data.get('rulePackedAs'),
                    'ruleFormat': data.get('ruleFormat'),
                    'rulePackedAs': data.get('rulePackedAs'),
                    'stockUnit': stock_unit
                })
            elif product_type == 'chemicals':
                return sanitize({
                    'stockType': stock_type,
                    'productFormat': data.get('productFormat'),
                    'chemicalUnit': data.get('chemicalUnit')
                })
            return sanitize({'stockType': stock_type})

        def build_stock_record(product_id):
            stock_data = {
                'productType': product_type,
                'productName': data['productName'],
                'productId': product_id,
                'stockType': stock_type,
                'importDate': datetime.strptime(data['importDate'], '%Y-%m-%d') if data.get('importDate') else None,
                'takenDate': datetime.strptime(data['takenDate'], '%Y-%m-%d') if data.get('takenDate') else None,
                'createdAt': datetime.utcnow()
            }

            quantity = 0

            if product_type in blanket_types:
                stock_data.update(sanitize({
                    'thickness': data.get('thickness'),
                    'thicknessUnit': data.get('thicknessUnit', 'mm'),
                    'rollNumber': data.get('rollNumber')
                }))

                if stock_type == 'roll':
                    stock_data.update(sanitize({
                        'length': data.get('length'),
                        'width': data.get('width'),
                        'lengthUnit': data.get('lengthUnit', 'mm'),
                        'widthUnit': data.get('widthUnit', 'mm'),
                        'sqMtr': data.get('sqMtr')
                    }))
                    quantity = float(data.get('sqMtr', 0))
                elif stock_type == 'pieces':
                    stock_data.update(sanitize({
                        'numberOfPieces': data.get('numberOfPieces'),
                        'length': data.get('length'),
                        'width': data.get('width'),
                        'lengthUnit': data.get('lengthUnit', 'mm'),
                        'widthUnit': data.get('widthUnit', 'mm')
                    }))
                    quantity = int(data.get('numberOfPieces', 0))
            elif product_type == 'litho perf':
                stock_data.update(sanitize({
                    'lithoPieceType': data.get('lithoPieceType'),
                    'perforationType': data.get('perforationType'),
                    'productTPI': data.get('productTPI'),
                    'stock': data.get('stock')
                }))
                quantity = float(data.get('stock', 0))
            elif product_type == 'matrix':
                stock_data.update(sanitize({
                    'matrixFormat': data.get('matrixFormat'),
                    'matrixSizeWidth': data.get('matrixSizeWidth'),
                    'matrixSizeHeight': data.get('matrixSizeHeight'),
                    'stock': data.get('stock'),
                    'stockUnit': 'pkts'
                }))
                quantity = float(data.get('stock', 0))
            elif product_type == 'rules':
                stock_unit = 'coils' if data.get('rulePackedAs') == 'coil' else 'pkts'
                stock_data.update(sanitize({
                    'ruleFormat': data.get('ruleFormat'),
                    'rulePackedAs': data.get('rulePackedAs'),
                    'stockUnit': stock_unit,
                    'stock': data.get('stock')
                }))
                quantity = float(data.get('stock', 0))
            elif product_type == 'chemicals':
                stock_data.update(sanitize({
                    'productFormat': data.get('productFormat'),
                    'chemicalUnit': data.get('chemicalUnit'),
                    'stock': data.get('stock')
                }))
                quantity = float(data.get('stock', 0))
            else:
                quantity = float(data.get('stock', 0))

            return stock_data, quantity

        # Identify existing product
        if product_type in blanket_types:
            if stock_type == 'roll':
                existing_product = db.products.find_one({
                    'name': data['productName'],
                    'category': product_type,
                    'dimensions.stockType': 'roll',
                    '$or': [
                        {'dimensions.rollNumber': data.get('rollNumber')},
                        {'$and': [
                            {'dimensions.length': data.get('length')},
                            {'dimensions.width': data.get('width')}
                        ]}
                    ]
                })
            elif stock_type == 'pieces':
                if product_type == 'matrix':
                    # For matrix products, check name, category, size dimensions, and thickness
                    existing_product = db.products.find_one({
                        'name': data['productName'],
                        'category': product_type,
                        'dimensions.matrixSizeWidth': data.get('matrixSizeWidth'),
                        'dimensions.matrixSizeHeight': data.get('matrixSizeHeight'),
                        'dimensions.thickness': data.get('thickness'),
                        'dimensions.thicknessUnit': data.get('thicknessUnit', 'mm')
                    })
                else:
                    # For other pieces products (litho perf, rules)
                    existing_product = db.products.find_one({
                        'name': data['productName'],
                        'category': product_type,
                        'dimensions.stockType': 'pieces'
                    })
            else:
                existing_product = db.products.find_one({
                    'name': data['productName'],
                    'category': product_type
                })
        else:
            if product_type == 'matrix':
                # For matrix products without stock type, check name, category, size dimensions, and thickness
                existing_product = db.products.find_one({
                    'name': data['productName'],
                    'category': product_type,
                    'dimensions.matrixSizeWidth': data.get('matrixSizeWidth'),
                    'dimensions.matrixSizeHeight': data.get('matrixSizeHeight'),
                    'dimensions.thickness': data.get('thickness'),
                    'dimensions.thicknessUnit': data.get('thicknessUnit', 'mm')
                })
            elif product_type == 'chemicals':
                # For chemicals products, check name, category, and product format
                existing_product = db.products.find_one({
                    'name': data['productName'],
                    'category': product_type,
                    'dimensions.productFormat': data.get('productFormat')
                })
            else:
                existing_product = db.products.find_one({
                    'name': data['productName'],
                    'category': product_type
                })

        # Duplicate roll detection only for blanket/underpacking rolls
        if existing_product and product_type in blanket_types and stock_type == 'roll':
            return jsonify({
                'error': 'DUPLICATE_ROLL',
                'message': f'Roll "{data.get("rollNumber", "Unknown")}" for "{data["productName"]}" already exists with same dimensions.',
                'existingProduct': {
                    'name': existing_product['name'],
                    'rollNumber': existing_product.get('dimensions', {}).get('rollNumber', 'N/A'),
                    'length': existing_product.get('dimensions', {}).get('length', 'N/A'),
                    'width': existing_product.get('dimensions', {}).get('width', 'N/A'),
                    'importDate': existing_product.get('dimensions', {}).get('importDate', 'N/A')
                },
                'requiresConfirmation': True
            }), 409

        new_dimensions = build_dimensions_payload()

        if not existing_product:
            product_data = {
                'name': data['productName'],
                'category': product_type,
                'stock': 0,
                'imported': data.get('imported', True),
                'dimensions': new_dimensions,
                'createdAt': datetime.utcnow()
            }
            product_result = db.products.insert_one(product_data)
            product_id = str(product_result.inserted_id)
        else:
            product_id = str(existing_product['_id'])
            if new_dimensions:
                merged_dimensions = existing_product.get('dimensions', {}).copy()
                merged_dimensions.update(new_dimensions)
                Product.update_dimensions(product_id, merged_dimensions)

        stock_data, stock_quantity = build_stock_record(product_id)

        # Insert into detailed stock collection
        result = db.detailed_stock.insert_one(stock_data)

        # Update product stock and record transaction
        product = Product.get_by_id(product_id)
        if product:
            new_stock_total = product.get('stock', 0) + stock_quantity
            Product.update_stock(product_id, new_stock_total)

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

@stock_bp.route('/stock/in/detailed/confirm-duplicate', methods=['POST'])
def confirm_duplicate_roll():
    """Handle duplicate roll confirmation - either delete or add with import date"""
    try:
        data = request.get_json()
        action = data.get('action')  # 'delete' or 'add_with_date'
        roll_data = data.get('rollData')
        
        if action == 'delete':
            # User confirmed it's a duplicate, don't add anything
            return jsonify({'message': 'Duplicate roll entry discarded'}), 200
            
        elif action == 'add_with_date':
            # User wants to add as separate entry with import date
            if not roll_data.get('importDate'):
                return jsonify({'error': 'Import date is required for separate entry'}), 400
            
            # Create a unique product name with import date
            import_date_str = roll_data['importDate']
            unique_name = f"{roll_data['productName']} ({import_date_str})"
            
            # Check if this unique name already exists
            existing_unique = db.products.find_one({
                'name': unique_name,
                'category': roll_data['productType']
            })
            
            if existing_unique:
                return jsonify({'error': 'Entry with this import date already exists'}), 400
            
            # Create new product with unique name
            dimensions = {
                'length': roll_data['length'],
                'width': roll_data['width'],
                'lengthUnit': roll_data.get('lengthUnit', 'mm'),
                'widthUnit': roll_data.get('widthUnit', 'mm'),
                'thickness': roll_data['thickness'],
                'thicknessUnit': roll_data.get('thicknessUnit', 'mm'),
                'rollNumber': roll_data.get('rollNumber'),
                'stockType': 'roll',
                'importDate': import_date_str
            }
            
            product_data = {
                'name': unique_name,
                'category': roll_data['productType'],
                'stock': roll_data.get('sqMtr', 0),
                'imported': roll_data.get('imported', True),
                'dimensions': dimensions,
                'createdAt': datetime.utcnow()
            }
            
            product_result = db.products.insert_one(product_data)
            product_id = str(product_result.inserted_id)
            
            # Create detailed stock record
            stock_data = {
                'productType': roll_data['productType'],
                'productName': unique_name,
                'productId': product_id,
                'stockType': 'roll',
                'length': roll_data['length'],
                'width': roll_data['width'],
                'thickness': roll_data['thickness'],
                'rollNumber': roll_data.get('rollNumber'),
                'importDate': datetime.strptime(import_date_str, '%Y-%m-%d') if import_date_str else None,
                'takenDate': datetime.strptime(roll_data['takenDate'], '%Y-%m-%d') if roll_data.get('takenDate') else None,
                'sqMtr': roll_data.get('sqMtr'),
                'createdAt': datetime.utcnow()
            }
            
            db.detailed_stock.insert_one(stock_data)
            
            return jsonify({
                'message': 'Roll added successfully with import date differentiation',
                'uniqueName': unique_name
            }), 200
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
