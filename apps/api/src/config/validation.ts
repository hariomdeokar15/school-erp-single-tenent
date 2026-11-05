import { z } from "zod";

const placeholderKey = "<GENERATED_IN_SECRET_MANAGER>";

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
        message: "DATABASE_URL must use postgres:// or postgresql://",
      })
      .default("postgresql://schoolerp:CHANGE_ME_LOCAL_ONLY@localhost:5432/schoolerp"),
    REDIS_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith("redis://") || value.startsWith("rediss://"), {
        message: "REDIS_URL must use redis:// or rediss://",
      })
      .default("redis://localhost:6379"),
    JWT_PRIVATE_KEY: z.string().default(placeholderKey),
    JWT_PUBLIC_KEY: z.string().default(placeholderKey),
    CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
    FEATURE_FLAGS: z
      .string()
      .default("")
      .transform((value) =>
        [...new Set(value.split(",").map((flag) => flag.trim()).filter(Boolean))],
      )
      .pipe(z.array(z.string().regex(/^[a-z][a-z0-9-]*$/, "Feature flag names must be lowercase kebab-case"))),
  })
  .superRefine((environment, context) => {
    const origins = environment.CORS_ALLOWED_ORIGINS.split(",").map((origin) =>
      origin.trim(),
    );

    if (origins.some((origin) => !origin)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ALLOWED_ORIGINS"],
        message: "CORS_ALLOWED_ORIGINS cannot contain an empty origin",
      });
    }

    for (const origin of origins.filter(Boolean)) {
      try {
        const parsedOrigin = new URL(origin);
        if (
          !["http:", "https:"].includes(parsedOrigin.protocol) ||
          parsedOrigin.origin !== origin
        ) {
          throw new Error("Origin must contain only a scheme and host");
        }
        if (
          environment.NODE_ENV === "production" &&
          (parsedOrigin.protocol !== "https:" ||
            ["localhost", "127.0.0.1", "::1"].includes(parsedOrigin.hostname))
        ) {
          throw new Error("Production CORS origins must use a public HTTPS host");
        }
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ALLOWED_ORIGINS"],
          message:
            error instanceof Error ? error.message : "Invalid CORS origin",
        });
      }
    }

    if (environment.NODE_ENV === "production") {
      for (const [name, value] of [
        ["JWT_PRIVATE_KEY", environment.JWT_PRIVATE_KEY],
        ["JWT_PUBLIC_KEY", environment.JWT_PUBLIC_KEY],
      ] as const) {
        if (value === placeholderKey || !value.includes("-----BEGIN")) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: `${name} must be provided as a PEM key in production`,
          });
        }
      }
    }
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
