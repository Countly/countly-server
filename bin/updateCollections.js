// Force logout all users since during login each user will be assigned an api_key
db.user_sessions.remove();