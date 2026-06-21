require('dotenv').config()

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  email: {
    from: process.env.EMAIL_FROM || 'noreply@metamaths.app',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },

  apis: {
    riot: process.env.RIOT_API_KEY,
    opendota: process.env.OPENDOTA_API_KEY,
    pandascore: process.env.PANDASCORE_API_KEY,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
}
