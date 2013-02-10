// Force logout all users since during login each user will be assigned an api_key
db.sessions_.remove();