import { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "../services/securityLogger";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory sliding rate limiter store.
 */
class MemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Periodic garbage collection of expired buckets every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetTime) {
          this.store.delete(key);
        }
      }
    }, 2 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }
}

export const rateLimiterStore = new MemoryRateLimiter();

export interface CreateRateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  name?: string;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || req.ip || "unknown-ip";
}

export function createRateLimiter(options: CreateRateLimiterOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests. Please try again later.",
    keyGenerator = (req) => `${options.name || "rate"}:${getClientIp(req)}`,
    name = "rate_limit",
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const result = rateLimiterStore.check(key, max, windowMs);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining));

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfterSeconds);

      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        ip: getClientIp(req),
        action: req.path,
        resource: name,
        reason: `Exceeded ${max} requests in ${windowMs / 1000}s`,
      });

      res.status(429).json({
        error: message,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

// 1. OTP Send: 5 requests per 10 minutes per IP/email
export const otpSendLimiter = createRateLimiter({
  name: "otp_send",
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many verification code requests. Please wait a few minutes before trying again.",
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "";
    const ip = getClientIp(req);
    return `otp_send:${ip}:${email}`;
  },
});

// 2. OTP Verification: 10 attempts per 10 minutes per IP
export const otpVerifyLimiter = createRateLimiter({
  name: "otp_verify",
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Please wait 10 minutes before retrying.",
  keyGenerator: (req) => `otp_verify:${getClientIp(req)}`,
});

// 3. Chat generation: 40 requests per minute per IP / authenticated user
export const chatRateLimiter = createRateLimiter({
  name: "chat",
  windowMs: 60 * 1000,
  max: 40,
  message: "Chat request limit reached. Please slow down.",
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      return `chat_user:${authHeader.slice(-16)}`;
    }
    return `chat_ip:${getClientIp(req)}`;
  },
});

// 4. Image generation: 12 requests per minute per IP / user
export const imageRateLimiter = createRateLimiter({
  name: "image_gen",
  windowMs: 60 * 1000,
  max: 12,
  message: "Image generation rate limit reached. Please wait a moment before creating more artwork.",
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      return `img_user:${authHeader.slice(-16)}`;
    }
    return `img_ip:${getClientIp(req)}`;
  },
});

// 5. Voice transcription: 25 requests per minute
export const voiceRateLimiter = createRateLimiter({
  name: "voice_transcribe",
  windowMs: 60 * 1000,
  max: 25,
  message: "Voice transcription rate limit exceeded. Please wait a moment.",
  keyGenerator: (req) => `voice_ip:${getClientIp(req)}`,
});

// 6. File upload: 20 uploads per minute per user/IP
export const fileUploadLimiter = createRateLimiter({
  name: "file_upload",
  windowMs: 60 * 1000,
  max: 20,
  message: "File upload rate limit exceeded. Please wait before uploading more files.",
  keyGenerator: (req) => `upload_ip:${getClientIp(req)}`,
});

// 7. Admin endpoints: 15 attempts per minute per IP
export const adminRateLimiter = createRateLimiter({
  name: "admin_endpoint",
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many admin requests. Access temporarily restricted.",
  keyGenerator: (req) => `admin_ip:${getClientIp(req)}`,
});

// 8. General API rate limiter: 150 requests per minute per IP
export const generalApiLimiter = createRateLimiter({
  name: "general_api",
  windowMs: 60 * 1000,
  max: 150,
  message: "Too many requests. Please slow down.",
  keyGenerator: (req) => `gen_ip:${getClientIp(req)}`,
});
