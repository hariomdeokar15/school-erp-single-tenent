import { z } from "zod";

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z
    .string()
    .default("postgresql://schoolerp:CHANGE_ME@localhost:5432/schoolerp"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_PRIVATE_KEY: z.string().default("<GENERATED_IN_SECRET_MANAGER>"),
  JWT_PUBLIC_KEY: z.string().default("<GENERATED_IN_SECRET_MANAGER>"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentConfig {
  const result = environmentSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Environment validation error: ${result.error.message}`);
  }
  return result.data;
}
