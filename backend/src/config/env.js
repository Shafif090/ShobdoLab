import dotenv from "dotenv";

dotenv.config();

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

const publicWebUrl = trimTrailingSlash(
  process.env.PUBLIC_WEB_URL ||
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"),
);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInteger(process.env.PORT, 5000),
  publicWebUrl,
  passwordResetRedirectUrl:
    trimTrailingSlash(process.env.PASSWORD_RESET_REDIRECT_URL) ||
    (publicWebUrl ? `${publicWebUrl}/reset-password` : ""),
  allowedOrigins: parseList(process.env.CORS_ORIGINS),
  jsonLimit: process.env.JSON_LIMIT || "100kb",
  rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, 300),
  authRateLimitWindowMs: parseInteger(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  authRateLimitMax: parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 20),
};

export function isProduction() {
  return env.nodeEnv === "production";
}
