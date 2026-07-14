process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://pagui:pagui@localhost:5439/pagui'
process.env.JWT_SECRET = 'test-secret-not-for-production'
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only'
process.env.LOG_LEVEL = 'error'
