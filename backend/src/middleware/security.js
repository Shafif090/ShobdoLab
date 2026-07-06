import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, isProduction } from "../config/env.js";

const defaultDevelopmentOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (env.allowedOrigins.length > 0) {
    return env.allowedOrigins.includes(origin);
  }

  if (!isProduction()) {
    try {
      const { hostname } = new URL(origin);
      return (
        defaultDevelopmentOrigins.has(origin) ||
        hostname === "devtunnels.ms" ||
        hostname.endsWith(".devtunnels.ms")
      );
    } catch {
      return false;
    }
  }

  return false;
}

export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  maxAge: 86400,
});

export const generalRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again soon.",
      details: null,
    },
  },
});

export const authRateLimit = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "AUTH_RATE_LIMITED",
      message: "Too many auth attempts. Please try again soon.",
      details: null,
    },
  },
});
