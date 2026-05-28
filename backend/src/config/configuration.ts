export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10) || 3001,
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10) || 0,
    url: process.env.REDIS_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'changeme_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'changeme_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    mfaSecret: process.env.JWT_MFA_SECRET ?? 'changeme_mfa_secret',
    mfaExpiresIn: process.env.JWT_MFA_EXPIRES_IN ?? '10m',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },

  email: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'noreply@ereko.market',
    fromName: process.env.EMAIL_FROM_NAME ?? 'EREKO Market',
  },

  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10) || 60000,
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10) || 100,
  },

  loyalty: {
    pointsPerPound: parseInt(process.env.LOYALTY_POINTS_PER_POUND ?? '10', 10) || 10,
    pointValuePence: parseInt(process.env.LOYALTY_POINT_VALUE_PENCE ?? '1', 10) || 1,
    familyThreshold: parseInt(process.env.LOYALTY_FAMILY_THRESHOLD ?? '500', 10) || 500,
    elderThreshold: parseInt(process.env.LOYALTY_ELDER_THRESHOLD ?? '2000', 10) || 2000,
    royaltyThreshold: parseInt(process.env.LOYALTY_ROYALTY_THRESHOLD ?? '5000', 10) || 5000,
  },

  freeShippingThresholdMinor: parseInt(process.env.FREE_SHIPPING_THRESHOLD_MINOR ?? '5500', 10) || 5500,

  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  },
});
