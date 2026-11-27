import { validateEnvironment } from "./validation";

export default () => {
  const env = validateEnvironment(process.env);
  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    auth: {
      privateKey: env.JWT_PRIVATE_KEY,
      publicKey: env.JWT_PUBLIC_KEY,
      resetTokenTtlMinutes: env.AUTH_RESET_TOKEN_TTL_MINUTES,
    },
    email: {
      frontendOrigin: env.AUTH_FRONTEND_ORIGIN,
      outboxKeys: env.EMAIL_OUTBOX_KEYS,
      outboxActiveKeyVersion: env.EMAIL_OUTBOX_ACTIVE_KEY_VERSION,
      transport: env.EMAIL_TRANSPORT,
      brevoApiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL,
      senderName: env.BREVO_SENDER_NAME,
      allowLive: env.ALLOW_LIVE_EMAILS,
      sensitiveRetentionConfirmed: env.BREVO_SENSITIVE_RETENTION_CONFIRMED,
    },
    rateLimit: {
      resetIpBurstLimit: env.AUTH_RESET_IP_BURST_LIMIT,
      resetIpHourlyLimit: env.AUTH_RESET_IP_HOURLY_LIMIT,
    },
    features: {
      enabled: env.FEATURE_FLAGS,
    },
    cors: {
      origins: env.CORS_ALLOWED_ORIGINS.split(",").map((origin) =>
        origin.trim(),
      ),
    },
  };
};
