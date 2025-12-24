from db.database import db

class User:
    def __init__(self, username, password, role='user'):
        self.username = username
        self.password = password  # In production, hash this
        self.role = role

    def save(self):
        user_data = {
            'username': self.username,
            'password': self.password,
            'role': self.role
        }
        result = db.users.insert_one(user_data)
        return result.inserted_id

    @staticmethod
    def get_all():
        return list(db.users.find())

    @staticmethod
    def get_by_username(username):
        return db.users.find_one({'username': username})
