from flask import Flask
from flask_cors import CORS
from routes.products import products_bp
from routes.stock import stock_bp
from routes.reports import reports_bp

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Register blueprints
app.register_blueprint(products_bp, url_prefix='/api')
app.register_blueprint(stock_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True)
