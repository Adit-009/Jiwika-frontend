import { getRequest } from "@tanstack/react-start/server";

// Keep track of request counts and window reset times per IP address
const ipRequests = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(limit = 60, windowMs = 60000) {
  const req = getRequest();
  if (!req) return; // Ignore if run outside server environment

  // Extract client IP address from standard headers or default to a fallback
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown-ip";

  const now = Date.now();
  const record = ipRequests.get(ip);

  if (!record || now > record.resetTime) {
    ipRequests.set(ip, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (record.count >= limit) {
    throw new Error("Too many requests. Please try again later.");
  }

  record.count++;
}
