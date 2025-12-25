from pymongo import MongoClient

# MongoDB connection
client = MongoClient('mongodb+srv://athulnair3096_db_user:STOCKSNSKU@stocknsku.8eyi7c3.mongodb.net/')
db = client['stock_management']

# Collections
products = db['products']
stock_transactions = db['stock_transactions']
users = db['users']
companies = db['companies']
