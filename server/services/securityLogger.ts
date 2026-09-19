/**
 * MEYRA AI — Defensive Security Logger
 * 
 * Provides safe, structured logging for security-relevant events.
 * 
 * SECURITY INVARIANTS:
 * - NEVER logs passwords, raw OTP values, API keys, session secrets, or full private tokens.
 * - Masks PII (emails, user IDs).
 * - Records timestamps, client IPs (anonymized/truncated where appropriate), and event types.
 */

export type SecurityEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "OTP_SENT"
  | "OTP_VERIFY_SUCCESS"
  | "OTP_VERIFY_FAILURE"
  | "OTP_ABUSE_DETECTED"
  | "SESSION_CREATED"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED"
  | "SESSION_TAMPERED"
  | "AUTHORIZATION_FAILURE"
  | "IDOR_ATTEMPT_BLOCKED"
  | "FORGED_IDENTITY_BLOCKED"
  | "ADMIN_ACCESS_SUCCESS"
  | "ADMIN_ACCESS_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "INPUT_VALIDATION_FAILURE"
  | "PATH_TRAVERSAL_BLOCKED"
  | "MALICIOUS_PAYLOAD_BLOCKED"
  | "SSRF_ATTEMPT_BLOCKED";

export interface SecurityEventDetails {
  ip?: string;
  userId?: string;
  email?: string;
  resource?: string;
  action?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

function maskEmail(email?: string): string {
  if (!email) return "[anonymous]";
  const parts = email.split("@");
  if (parts.length !== 2) return "[redacted-email]";
  const user = parts[0];
  const domain = parts[1];
  const maskedUser =
    user.length <= 2 ? user.slice(0, 1) + "***" : user.slice(0, 2) + "***" + user.slice(-1);
  return `${maskedUser}@${domain}`;
}

function maskIdentifier(id?: string): string {
  if (!id) return "[none]";
  if (id.length <= 6) return "***";
  return id.slice(0, 4) + "..." + id.slice(-2);
}

export function logSecurityEvent(type: SecurityEventType, details: SecurityEventDetails = {}): void {
  const timestamp = new Date().toISOString();
  const safeLog = {
    timestamp,
    event: type,
    ip: details.ip ? details.ip.split(",")[0].trim() : "unknown",
    user: details.userId ? maskIdentifier(details.userId) : undefined,
    account: details.email ? maskEmail(details.email) : undefined,
    resource: details.resource,
    action: details.action,
    reason: details.reason,
  };

  // Structured security log
  if (
    type.includes("FAILURE") ||
    type.includes("DENIED") ||
    type.includes("BLOCKED") ||
    type.includes("ABUSE") ||
    type.includes("TAMPERED")
  ) {
    console.warn(`[SECURITY AUDIT - WARN] [${type}]`, JSON.stringify(safeLog));
  } else {
    console.log(`[SECURITY AUDIT - INFO] [${type}]`, JSON.stringify(safeLog));
  }
}
