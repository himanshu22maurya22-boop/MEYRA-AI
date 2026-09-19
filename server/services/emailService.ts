import crypto from "crypto";
import nodemailer from "nodemailer";

interface StoredOtpRecord {
  hashedOtp: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  lastSentAt: number;
  email: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory security stores (hashed entries only)
const otpStore = new Map<string, StoredOtpRecord>();
const rateLimitStore = new Map<string, RateLimitRecord>();

// Server-side crypto salt (generated per process lifetime or from environment)
const SERVER_SALT =
  process.env.OTP_SECRET_SALT ||
  crypto.randomBytes(32).toString("hex");

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SENDS_PER_WINDOW = 3;

/**
 * Normalizes email address for consistent indexing.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hashes OTP with HMAC-SHA256 and server-side secret.
 * Raw OTP is NEVER stored in database or memory.
 */
function hashOtp(otp: string, email: string): string {
  return crypto
    .createHmac("sha256", SERVER_SALT)
    .update(`${normalizeEmail(email)}:${otp}`)
    .digest("hex");
}

/**
 * Checks if a real email delivery service is configured.
 */
export function isEmailConfigured(): boolean {
  const hasSmtp = Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_USER.trim() !== "" &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS.trim() !== ""
  );

  const hasResend = Boolean(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY.trim() !== ""
  );

  return hasSmtp || hasResend;
}

/**
 * Returns configuration diagnosis for administrators/developers.
 */
export function getEmailProviderStatus() {
  const isConfigured = isEmailConfigured();
  return {
    configured: isConfigured,
    provider: process.env.RESEND_API_KEY
      ? "Resend"
      : process.env.SMTP_USER
      ? "SMTP"
      : "None",
    smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}***` : null,
    smtpHost: process.env.SMTP_HOST || (process.env.SMTP_USER ? "smtp.gmail.com" : null),
    requiredVariables: [
      "SMTP_USER (e.g. himanshu22maurya22@gmail.com)",
      "SMTP_PASS (e.g. Google 16-character App Password)",
      "or RESEND_API_KEY (from resend.com)",
    ],
  };
}

/**
 * Checks rate limiting for an email or IP.
 */
function checkRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= MAX_SENDS_PER_WINDOW) {
    const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

/**
 * Sends real email using Nodemailer (SMTP) or Resend API.
 */
async function dispatchEmail(to: string, otp: string): Promise<void> {
  const subject = "Your MEYRA AI Verification Code";
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0A0A0E; color: #FFFFFF; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 0; letter-spacing: 1px;">MEYRA AI</h1>
        <p style="font-size: 13px; color: #818CF8; margin-top: 4px; font-weight: 600;">Advanced Multimodal Intelligence</p>
      </div>

      <div style="background-color: #13131F; border-radius: 12px; padding: 24px; border: 1px solid rgba(99,102,241,0.2); text-align: center;">
        <p style="font-size: 14px; color: #94A3B8; margin: 0 0 16px 0;">Use the verification code below to complete your MEYRA AI account setup:</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; background: rgba(56, 189, 248, 0.1); padding: 16px 24px; border-radius: 10px; display: inline-block; font-family: monospace;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748B; margin-top: 16px; margin-bottom: 0;">This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
      </div>

      <div style="margin-top: 24px; font-size: 11px; color: #64748B; text-align: center; line-height: 1.6;">
        <p style="margin: 0;">If you did not request this verification code, you can safely ignore this email.</p>
        <p style="margin: 6px 0 0 0;">MEYRA AI Platform • Created &amp; Founded by Himanshu Maurya</p>
      </div>
    </div>
  `;

  // Option 1: Resend API
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "MEYRA AI <onboarding@resend.dev>",
        to: [to],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend email delivery failed (${res.status}): ${err}`);
    }
    return;
  }

  // Option 2: Nodemailer SMTP
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"MEYRA AI" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Generates, hashes, stores, and dispatches a 6-digit email OTP.
 */
export async function sendEmailOtp(
  email: string,
  clientIp: string = "unknown"
): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  requiresConfiguration?: boolean;
}> {
  const normalized = normalizeEmail(email);

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error("Please provide a valid email address.");
  }

  // Check rate limit by email and IP
  const emailRateCheck = checkRateLimit(`email:${normalized}`);
  if (!emailRateCheck.allowed) {
    return {
      success: false,
      message: `Too many requests for this email. Please wait ${emailRateCheck.waitSeconds} seconds before trying again.`,
      cooldownSeconds: emailRateCheck.waitSeconds,
    };
  }

  const ipRateCheck = checkRateLimit(`ip:${clientIp}`);
  if (!ipRateCheck.allowed) {
    return {
      success: false,
      message: `Too many requests from your network. Please wait ${ipRateCheck.waitSeconds} seconds.`,
      cooldownSeconds: ipRateCheck.waitSeconds,
    };
  }

  // Check resend cooldown
  const existing = otpStore.get(normalized);
  const now = Date.now();
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const remaining = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remaining} seconds before requesting a new verification code.`,
      cooldownSeconds: remaining,
    };
  }

  // Check if real email provider is configured
  if (!isEmailConfigured()) {
    return {
      success: false,
      requiresConfiguration: true,
      message:
        "Real email delivery provider is not yet configured on the server. Please configure SMTP_USER & SMTP_PASS (such as a Google App Password) or RESEND_API_KEY in your environment settings.",
    };
  }

  // Generate cryptographically secure 6-digit numeric OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOtp(rawOtp, normalized);

  // Store hashed OTP with security constraints
  otpStore.set(normalized, {
    hashedOtp,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    lastSentAt: now,
    email: normalized,
  });

  try {
    // Send real email via configured provider
    await dispatchEmail(normalized, rawOtp);

    return {
      success: true,
      message: `Verification code sent to ${normalized}. It expires in 10 minutes.`,
      cooldownSeconds: 60,
    };
  } catch (err: any) {
    // If sending fails, delete record so user can retry immediately
    otpStore.delete(normalized);
    console.error("Email dispatch failure:", err?.message || err);
    throw new Error(`Failed to send verification email: ${err?.message || "Check SMTP credentials"}`);
  }
}

/**
 * Verifies a 6-digit OTP against server-side hashed record.
 * Follows strict one-time use, attempt limits, and expiration rules.
 */
export function verifyEmailOtp(
  email: string,
  submittedOtp: string
): {
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
} {
  const normalized = normalizeEmail(email);
  const record = otpStore.get(normalized);

  if (!record) {
    return {
      valid: false,
      error: "No active verification code found for this email. Please request a new code.",
    };
  }

  const now = Date.now();

  // Expiration check
  if (now > record.expiresAt) {
    otpStore.delete(normalized);
    return {
      valid: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  // Maximum attempts check
  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(normalized);
    return {
      valid: false,
      error: "Maximum verification attempts exceeded. For security, please request a new code.",
    };
  }

  // Sanitize submitted OTP
  const cleanSubmitted = submittedOtp.trim().replace(/\D/g, "");
  if (cleanSubmitted.length !== 6) {
    return {
      valid: false,
      error: "Please enter a valid 6-digit verification code.",
    };
  }

  // Compare submitted OTP hash with stored hash (timing-safe comparison)
  const submittedHash = hashOtp(cleanSubmitted, normalized);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(record.hashedOtp, "hex")
  );

  if (!isValid) {
    record.attempts += 1;
    const remaining = record.maxAttempts - record.attempts;

    if (remaining <= 0) {
      otpStore.delete(normalized);
      return {
        valid: false,
        error: "Incorrect code. Maximum attempts reached. Please request a new code.",
        attemptsRemaining: 0,
      };
    }

    return {
      valid: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
      attemptsRemaining: remaining,
    };
  }

  // One-time use: Delete immediately upon successful verification
  otpStore.delete(normalized);

  return { valid: true };
}
