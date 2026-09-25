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
    },
    cors: {
      origins: env.CORS_ALLOWED_ORIGINS.split(",").map((origin) =>
        origin.trim(),
      ),
    },
  };
};
