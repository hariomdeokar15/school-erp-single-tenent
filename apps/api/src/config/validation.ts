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
      .refine(
        (value) =>
          value.startsWith("postgres://") || value.startsWith("postgresql://"),
        {
          message: "DATABASE_URL must use postgres:// or postgresql://",
        },
      )
      .default(
        "postgresql://schoolerp:CHANGE_ME_LOCAL_ONLY@localhost:5432/schoolerp",
      ),
    REDIS_URL: z
      .string()
      .url()
      .refine(
        (value) =>
          value.startsWith("redis://") || value.startsWith("rediss://"),
        {
          message: "REDIS_URL must use redis:// or rediss://",
        },
      )
      .default("redis://localhost:6379"),
    JWT_PRIVATE_KEY: z.string().default(placeholderKey),
    JWT_PUBLIC_KEY: z.string().default(placeholderKey),
    CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
    FEATURE_FLAGS: z
      .string()
      .default("")
      .transform((value) => [
        ...new Set(
          value
            .split(",")
            .map((flag) => flag.trim())
            .filter(Boolean),
        ),
      ])
      .pipe(
        z.array(
          z
            .string()
            .regex(
              /^[a-z][a-z0-9-]*$/,
              "Feature flag names must be lowercase kebab-case",
            ),
        ),
      ),
    AUTH_FRONTEND_ORIGIN: z
      .string()
      .url()
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return (
            parsed.origin === value &&
            parsed.pathname === "/" &&
            !parsed.search &&
            !parsed.hash
          );
        } catch {
          return false;
        }
      }, "AUTH_FRONTEND_ORIGIN must be a fixed origin without path, query, or fragment")
      .default("http://localhost:3001"),
    EMAIL_OUTBOX_KEYS: z.string().default(""),
    EMAIL_OUTBOX_ACTIVE_KEY_VERSION: z.string().default(""),
    EMAIL_TRANSPORT: z.enum(["test", "brevo"]).default("test"),
    BREVO_API_KEY: z.string().optional(),
    BREVO_SENDER_EMAIL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().email().optional(),
    ),
    BREVO_SENDER_NAME: z.string().min(1).max(100).default("SchoolERP"),
    ALLOW_LIVE_EMAILS: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    BREVO_SENSITIVE_RETENTION_CONFIRMED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    AUTH_RESET_TOKEN_TTL_MINUTES: z.coerce
      .number()
      .int()
      .min(5)
      .max(30)
      .default(15),
    AUTH_RESET_IP_BURST_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .default(30),
    AUTH_RESET_IP_HOURLY_LIMIT: z.coerce
      .number()
      .int()
      .min(10)
      .max(5000)
      .default(300),
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
          throw new Error(
            "Production CORS origins must use a public HTTPS host",
          );
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
      const frontend = new URL(environment.AUTH_FRONTEND_ORIGIN);
      if (frontend.protocol !== "https:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_FRONTEND_ORIGIN"],
          message: "AUTH_FRONTEND_ORIGIN must use HTTPS in production",
        });
      }
      if (
        !environment.EMAIL_OUTBOX_KEYS ||
        !environment.EMAIL_OUTBOX_ACTIVE_KEY_VERSION
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EMAIL_OUTBOX_KEYS"],
          message: "Outbox encryption keys are required in production",
        });
      }
    }
    if (environment.EMAIL_TRANSPORT === "brevo") {
      if (!environment.BREVO_API_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BREVO_API_KEY"],
          message: "BREVO_API_KEY is required when EMAIL_TRANSPORT=brevo",
        });
      }
      if (!environment.BREVO_SENDER_EMAIL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BREVO_SENDER_EMAIL"],
          message: "BREVO_SENDER_EMAIL is required when EMAIL_TRANSPORT=brevo",
        });
      }
    }
    if (
      environment.EMAIL_TRANSPORT === "brevo" &&
      environment.ALLOW_LIVE_EMAILS &&
      !environment.BREVO_SENSITIVE_RETENTION_CONFIRMED
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BREVO_SENSITIVE_RETENTION_CONFIRMED"],
        message:
          "Confirm Brevo preview suppression and bounded log retention before sending recovery links",
      });
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
