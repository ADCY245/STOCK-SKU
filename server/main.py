import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.products import products_bp
from routes.stock import stock_bp
from routes.reports import reports_bp
from routes.sku import sku_bp

app = Flask(__name__, static_folder='../public', static_url_path='')
CORS(app)  # Enable CORS for frontend

# Register blueprints
app.register_blueprint(products_bp, url_prefix='/api')
app.register_blueprint(stock_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')
app.register_blueprint(sku_bp, url_prefix='/api')

# Serve the main index.html at root route
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Serve stock-in page
@app.route('/stock-in.html')
def serve_stock_in():
    return send_from_directory(app.static_folder, 'stock-in.html')

# Serve products page
@app.route('/products.html')
def serve_products():
    return send_from_directory(app.static_folder, 'products.html')

# Serve other static pages
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# Serve favicon
@app.route('/favicon.ico')
def serve_favicon():
    return '', 204  # Return no content for favicon

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
