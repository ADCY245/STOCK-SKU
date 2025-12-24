from pymongo import MongoClient

# MongoDB connection (update with your connection string later)
client = MongoClient('mongodb://localhost:27017/')
db = client['stock_management']

# Collections
products = db['products']
stock_transactions = db['stock_transactions']
users = db['users']
