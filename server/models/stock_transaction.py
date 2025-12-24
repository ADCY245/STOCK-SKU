from db.database import db
from datetime import datetime

class StockTransaction:
    def __init__(self, product_id, quantity, transaction_type):
        self.product_id = product_id
        self.quantity = quantity
        self.transaction_type = transaction_type  # 'in' or 'out'
        self.timestamp = datetime.utcnow()

    def save(self):
        transaction_data = {
            'product_id': self.product_id,
            'quantity': self.quantity,
            'type': self.transaction_type,
            'timestamp': self.timestamp
        }
        result = db.stock_transactions.insert_one(transaction_data)
        return result.inserted_id

    @staticmethod
    def get_all():
        return list(db.stock_transactions.find())

    @staticmethod
    def get_by_product(product_id):
        return list(db.stock_transactions.find({'product_id': product_id}))
