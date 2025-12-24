from flask import Blueprint, request, jsonify
from models.product import Product
from models.stock_transaction import StockTransaction

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
