from flask import Blueprint, request, jsonify
from models.product import Product

products_bp = Blueprint('products', __name__)

@products_bp.route('/products', methods=['GET'])
def get_products():
    products = Product.get_all()
    return jsonify(products)

@products_bp.route('/products', methods=['POST'])
def add_product():
    data = request.get_json()
    name = data.get('name')
    category = data.get('category')

    if not name or not category:
        return jsonify({'error': 'Name and category are required'}), 400

    product = Product(name=name, category=category)
    product.save()
    return jsonify({'message': 'Product added successfully'}), 201
