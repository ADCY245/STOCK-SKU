from db.database import db
from bson import ObjectId
from datetime import datetime

class Product:
    def __init__(self, name, category, stock=0, imported=True, dimensions=None):
        self.name = name
        self.category = category
        self.stock = stock
        self.imported = imported
        self.dimensions = dimensions or {}

    def save(self):
        product_data = {
            'name': self.name,
            'category': self.category,
            'stock': self.stock,
            'imported': self.imported,
            'dimensions': self.dimensions,
            'createdAt': datetime.utcnow(),
            'lastUpdated': datetime.utcnow()
        }
        result = db.products.insert_one(product_data)
        return result.inserted_id

    @staticmethod
    def get_all():
        products = list(db.products.find())
        # Convert ObjectId to string for JSON serialization
        for product in products:
            product['_id'] = str(product['_id'])
            created_at = product.get('createdAt')
            if created_at is not None and hasattr(created_at, 'isoformat'):
                product['createdAt'] = created_at.isoformat()
            last_updated = product.get('lastUpdated')
            if last_updated is not None and hasattr(last_updated, 'isoformat'):
                product['lastUpdated'] = last_updated.isoformat()
        return products

    @staticmethod
    def get_by_id(product_id):
        return db.products.find_one({'_id': ObjectId(product_id)})

    @staticmethod
    def update_stock(product_id, stock):
        db.products.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': {'stock': stock, 'lastUpdated': datetime.utcnow()}}
        )
    
    @staticmethod
    def update_dimensions(product_id, dimensions):
        db.products.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': {'dimensions': dimensions, 'lastUpdated': datetime.utcnow()}}
        )
