import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.products import products_bp
from routes.stock import stock_bp
from routes.reports import reports_bp

app = Flask(__name__, static_folder='../public', static_url_path='')
CORS(app)  # Enable CORS for frontend

# Register blueprints
app.register_blueprint(products_bp, url_prefix='/api')
app.register_blueprint(stock_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')

# Serve the main index.html at root route
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Serve favicon
@app.route('/favicon.ico')
def serve_favicon():
    return '', 204  # Return no content for favicon

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
