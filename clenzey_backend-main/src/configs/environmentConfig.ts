import { HttpStatusCode } from "axios";
import dotenv from "dotenv";
import { z } from "zod";

import { AppError } from "../errors/appErrors.ts";
import ErrorCode from "../errors/errorCode.ts";
import { normalizeOrigin } from "../utilities/originUtils.ts";

const environment = process.env.NODE_ENV || "dev";

dotenv.config({
  path: environment === "prod" ? ".env" : ".env.dev",
  quiet: true,
});

const parseCsv = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((item) => normalizeOrigin(item))
        .filter(Boolean)
    : [];

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1";
};

const envSchema = z
  .object({
    ALLOWED_UPLOAD_URL_ORIGINS: z.string().optional(),
    OBJECT_STORAGE_ACCESS_KEY_ID: z.string().optional(),
    OBJECT_STORAGE_BUCKET: z.string().optional(),
    OBJECT_STORAGE_ENDPOINT: z.string().optional(),
    OBJECT_STORAGE_PRESIGN_EXPIRES_SEC: z.coerce
      .number()
      .int()
      .min(60)
      .max(3600)
      .default(900),
    OBJECT_STORAGE_PUBLIC_BASE_URL: z.string().optional(),
    OBJECT_STORAGE_REGION: z.string().default("auto"),
    OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
    CORS_ORIGINS: z.string().optional(),
    DATABASE_URL: z.string(),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
    DISPATCH_ESCALATION_MIN: z.coerce.number().int().min(1).max(60).default(5),
    DISPATCH_INITIAL_RADIUS_M: z.coerce.number().int().min(1000).max(50000).default(5000),
    DISPATCH_LOCATION_STALE_MIN: z.coerce.number().int().min(1).max(60).default(5),
    DISPATCH_MAX_DAILY_CAPACITY: z.coerce.number().int().min(1).max(50).default(8),
    DISPATCH_MAX_RADIUS_M: z.coerce.number().int().min(1000).max(100000).default(15000),
    DISPATCH_RADIUS_INCREMENT_M: z.coerce.number().int().min(500).max(10000).default(2000),
    DISPATCH_REDIRECT_INTERVAL_SEC: z.coerce.number().int().min(5).max(300).default(30),
    DISPATCH_REVALIDATE_LEAD_MIN: z.coerce.number().int().min(5).max(120).default(30),
    DISPATCH_SCHEDULED_CATCHUP_HOURS: z.coerce.number().int().min(1).max(168).default(48),
    ENABLE_RATE_LIMIT: z.string().optional(),
    ENABLE_SWAGGER: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    GOOGLE_MAPS_API_KEY: z.string().optional(),
    INTERNAL_API_KEY: z.string().optional(),
    JWT_SECRET: z.string().min(6),
    LOG_LEVEL: z
      .enum(["error", "warning", "info", "http", "debug"])
      .optional(),
    NODE_ENV: z.enum(["dev", "prod"]).default("dev"),
    PORT: z.coerce.number().default(3000),
    PAYROLL_CRON: z.string().default("0 2 1-5 * *"),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_SMS_FLOW_ID: z.string().optional(),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    REDIS_URL: z.string().optional(),
    SCHEDULED_DISPATCH_CRON: z.string().default("0 22 * * *"),
    SOCKET_CORS_ORIGINS: z.string().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "prod" && data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        message: "JWT_SECRET must be at least 32 characters in production",
        path: ["JWT_SECRET"],
      });
    }

    if (data.NODE_ENV === "prod") {
      const requiredInProd = [
        ["MSG91_AUTH_KEY", data.MSG91_AUTH_KEY],
        ["MSG91_SMS_FLOW_ID", data.MSG91_SMS_FLOW_ID],
        ["FIREBASE_PROJECT_ID", data.FIREBASE_PROJECT_ID],
        ["FIREBASE_CLIENT_EMAIL", data.FIREBASE_CLIENT_EMAIL],
        ["FIREBASE_PRIVATE_KEY", data.FIREBASE_PRIVATE_KEY],
        ["GOOGLE_MAPS_API_KEY", data.GOOGLE_MAPS_API_KEY],
        ["RAZORPAY_KEY_ID", data.RAZORPAY_KEY_ID],
        ["RAZORPAY_KEY_SECRET", data.RAZORPAY_KEY_SECRET],
        ["RAZORPAY_WEBHOOK_SECRET", data.RAZORPAY_WEBHOOK_SECRET],
        ["REDIS_URL", data.REDIS_URL],
        ["OBJECT_STORAGE_ACCESS_KEY_ID", data.OBJECT_STORAGE_ACCESS_KEY_ID],
        ["OBJECT_STORAGE_BUCKET", data.OBJECT_STORAGE_BUCKET],
        ["OBJECT_STORAGE_ENDPOINT", data.OBJECT_STORAGE_ENDPOINT],
        ["OBJECT_STORAGE_PUBLIC_BASE_URL", data.OBJECT_STORAGE_PUBLIC_BASE_URL],
        ["OBJECT_STORAGE_SECRET_ACCESS_KEY", data.OBJECT_STORAGE_SECRET_ACCESS_KEY],
        ["INTERNAL_API_KEY", data.INTERNAL_API_KEY],
      ] as const;

      for (const [key, value] of requiredInProd) {
        if (!value || value.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: `${key} is required in production`,
            path: [key],
          });
        }
      }

      if (data.INTERNAL_API_KEY && data.INTERNAL_API_KEY.length < 32) {
        ctx.addIssue({
          code: "custom",
          message: "INTERNAL_API_KEY must be at least 32 characters in production",
          path: ["INTERNAL_API_KEY"],
        });
      }

      const uploadOrigins = parseCsv(data.ALLOWED_UPLOAD_URL_ORIGINS);
      if (uploadOrigins.length === 0) {
        ctx.addIssue({
          code: "custom",
          message:
            "ALLOWED_UPLOAD_URL_ORIGINS must include at least one CDN origin in production",
          path: ["ALLOWED_UPLOAD_URL_ORIGINS"],
        });
      }
    }
  });

const envServer = envSchema.safeParse({
  ALLOWED_UPLOAD_URL_ORIGINS: process.env.ALLOWED_UPLOAD_URL_ORIGINS,
  OBJECT_STORAGE_ACCESS_KEY_ID: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
  OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET,
  OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT,
  OBJECT_STORAGE_PRESIGN_EXPIRES_SEC: process.env.OBJECT_STORAGE_PRESIGN_EXPIRES_SEC,
  OBJECT_STORAGE_PUBLIC_BASE_URL: process.env.OBJECT_STORAGE_PUBLIC_BASE_URL,
  OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION,
  OBJECT_STORAGE_SECRET_ACCESS_KEY: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_POOL_MAX: process.env.DB_POOL_MAX,
  DISPATCH_ESCALATION_MIN: process.env.DISPATCH_ESCALATION_MIN,
  DISPATCH_INITIAL_RADIUS_M: process.env.DISPATCH_INITIAL_RADIUS_M,
  DISPATCH_LOCATION_STALE_MIN: process.env.DISPATCH_LOCATION_STALE_MIN,
  DISPATCH_MAX_DAILY_CAPACITY: process.env.DISPATCH_MAX_DAILY_CAPACITY,
  DISPATCH_MAX_RADIUS_M: process.env.DISPATCH_MAX_RADIUS_M,
  DISPATCH_RADIUS_INCREMENT_M: process.env.DISPATCH_RADIUS_INCREMENT_M,
  DISPATCH_REDIRECT_INTERVAL_SEC: process.env.DISPATCH_REDIRECT_INTERVAL_SEC,
  DISPATCH_REVALIDATE_LEAD_MIN: process.env.DISPATCH_REVALIDATE_LEAD_MIN,
  DISPATCH_SCHEDULED_CATCHUP_HOURS: process.env.DISPATCH_SCHEDULED_CATCHUP_HOURS,
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT,
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  LOG_LEVEL: process.env.LOG_LEVEL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PAYROLL_CRON: process.env.PAYROLL_CRON,
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
  MSG91_SMS_FLOW_ID: process.env.MSG91_SMS_FLOW_ID,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  SCHEDULED_DISPATCH_CRON: process.env.SCHEDULED_DISPATCH_CRON,
  SOCKET_CORS_ORIGINS: process.env.SOCKET_CORS_ORIGINS,
  TRUST_PROXY: process.env.TRUST_PROXY,
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  throw new AppError(
    "There is an error with the server environment variables",
    {
      error: {
        code: ErrorCode.ENVIRONMENT_CONFIG_ERROR,
        details: envServer.error.issues,
      },
      statusCode: HttpStatusCode.InternalServerError,
    },
  );
}

const parsed = envServer.data;

const defaultDevOrigins = [
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4000",
  "http://127.0.0.1:4001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "http://localhost:4001",
  "http://localhost:5173",
  "http://localhost:8081",
  "http://localhost:8082",
];

const customCorsOrigins = parseCsv(parsed.CORS_ORIGINS);

export const envConfig = {
  ...parsed,
  ALLOWED_UPLOAD_URL_ORIGINS: parseCsv(parsed.ALLOWED_UPLOAD_URL_ORIGINS),
  CORS_ORIGINS:
    parsed.NODE_ENV === "prod"
      ? customCorsOrigins
      : customCorsOrigins.length > 0
        ? [...new Set([...defaultDevOrigins, ...customCorsOrigins])]
        : defaultDevOrigins,
  ENABLE_RATE_LIMIT: parseBoolean(
    parsed.ENABLE_RATE_LIMIT,
    parsed.NODE_ENV === "prod",
  ),
  ENABLE_SWAGGER: parseBoolean(
    parsed.ENABLE_SWAGGER,
    parsed.NODE_ENV !== "prod",
  ),
  LOG_LEVEL:
    parsed.LOG_LEVEL ?? (parsed.NODE_ENV === "prod" ? "info" : "debug"),
  SOCKET_CORS_ORIGINS: parseCsv(parsed.SOCKET_CORS_ORIGINS),
};
