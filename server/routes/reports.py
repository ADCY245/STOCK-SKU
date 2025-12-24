from flask import Blueprint, jsonify
from models.product import Product

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports', methods=['GET'])
def get_report():
    products = Product.get_all()
    report = []
    for product in products:
        report.append({
            'name': product['name'],
            'category': product['category'],
            'stock': product.get('stock', 0),
            'lastUpdated': product.get('lastUpdated', 'N/A')
        })
    return jsonify(report)
