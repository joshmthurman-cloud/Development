export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8901', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || 'localhost',
    port: parseInt(process.env.STORAGE_PORT || '9000', 10),
    useSSL: process.env.STORAGE_USE_SSL === 'true',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    bucketReceipts: process.env.STORAGE_BUCKET_RECEIPTS || 'receipts',
    bucketTemplates: process.env.STORAGE_BUCKET_TEMPLATES || 'templates',
    signedUrlExpiry: parseInt(process.env.STORAGE_SIGNED_URL_EXPIRY || '3600', 10),
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});
