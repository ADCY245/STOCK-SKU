from db.database import db

class Product:
    def __init__(self, name, category, stock=0, imported=True):
        self.name = name
        self.category = category
        self.stock = stock
        self.imported = imported

    def save(self):
        product_data = {
            'name': self.name,
            'category': self.category,
            'stock': self.stock,
            'imported': self.imported,
            'lastUpdated': None
        }
        result = db.products.insert_one(product_data)
        return result.inserted_id

    @staticmethod
    def get_all():
        return list(db.products.find())

    @staticmethod
    def get_by_id(product_id):
        from bson import ObjectId
        return db.products.find_one({'_id': ObjectId(product_id)})

    @staticmethod
    def update_stock(product_id, stock):
        from bson import ObjectId
        from datetime import datetime
        db.products.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': {'stock': stock, 'lastUpdated': datetime.utcnow()}}
        )
