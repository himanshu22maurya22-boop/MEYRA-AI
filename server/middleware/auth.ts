import { Request, Response, NextFunction } from "express";
import { verifySessionToken, getUserById, createOrUpdateUser } from "../services/userService";
import { logSecurityEvent } from "../services/securityLogger";
import { getClientIp } from "./rateLimiter";

export interface AuthenticatedUser {
  id: string;
  sub: string;
  email: string;
  name: string;
  username?: string;
  photoUrl?: string;
  role?: "user" | "admin";
  provider: "google" | "email_otp" | "session";
}

export function getFounderEmail(): string {
  return (
    process.env.FOUNDER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "himanshu22maurya22@gmail.com"
  )
    .toLowerCase()
    .trim();
}

/**
 * Extracts and verifies authentication token from Authorization header.
 * Supports:
 * 1. MEYRA HMAC-SHA256 Session Tokens
 * 2. Google OAuth2 ID Tokens (JWT)
 * 3. Google OAuth2 Access Tokens
 */
export async function authenticateUser(req: Request): Promise<AuthenticatedUser | null> {
  let token: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    return null;
  }

  // 1. Check if token is a MEYRA signed session token
  const sessionUserId = verifySessionToken(token);
  if (sessionUserId) {
    const user = getUserById(sessionUserId);
    if (user) {
      return {
        id: user.id,
        sub: user.id,
        email: user.email.toLowerCase().trim(),
        name: user.name,
        username: user.username,
        photoUrl: user.photoUrl,
        role: user.role,
        provider: user.provider as any,
      };
    }
  }

  // 2. Check if token is a Google JWT (ID Token)
  const tokenParts = token.split(".");
  if (tokenParts.length === 3) {
    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
      );
      if (verifyRes.ok) {
        const payload = await verifyRes.json();
        if (payload && payload.email) {
          const email = payload.email.toLowerCase().trim();
          const baseUsername = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "user";
          const defaultUsername = baseUsername.length >= 3 ? baseUsername : `${baseUsername}_${Date.now().toString().slice(-4)}`;

          // Ensure user exists in user store
          const { user } = createOrUpdateUser({
            email,
            name: payload.name || payload.given_name || "Google User",
            username: defaultUsername,
            provider: "google",
            photoUrl: payload.picture,
          });

          return {
            id: user.id,
            sub: payload.sub,
            email,
            name: user.name,
            username: user.username,
            photoUrl: user.photoUrl || payload.picture,
            role: user.role,
            provider: "google",
          };
        }
      }
    } catch (err) {
      console.warn("[Auth] Error verifying Google ID Token with tokeninfo:", err);
    }
  }

  // 3. Check if token is a Google OAuth2 Access Token
  try {
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (userinfoRes.ok) {
      const payload = await userinfoRes.json();
      if (payload && payload.email) {
        const email = payload.email.toLowerCase().trim();
        const baseUsername = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "user";
        const defaultUsername = baseUsername.length >= 3 ? baseUsername : `${baseUsername}_${Date.now().toString().slice(-4)}`;

        const { user } = createOrUpdateUser({
          email,
          name: payload.name || payload.given_name || "Google User",
          username: defaultUsername,
          provider: "google",
          photoUrl: payload.picture,
        });

        return {
          id: user.id,
          sub: payload.sub,
          email,
          name: user.name,
          username: user.username,
          photoUrl: user.photoUrl || payload.picture,
          role: user.role,
          provider: "google",
        };
      }
    }
  } catch (err) {
    console.warn("[Auth] Error verifying Google Access Token with userinfo:", err);
  }

  return null;
}

// Backward-compatibility alias
export const authenticateGoogleUser = authenticateUser;

/**
 * Express middleware requiring a valid authenticated session.
 * Never trusts client-supplied user IDs; sets req.user to verified identity.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await authenticateUser(req);

  if (!user) {
    logSecurityEvent("AUTH_FAILURE", {
      ip: getClientIp(req),
      action: req.path,
      reason: "Missing or invalid authentication credentials",
    });

    res.status(401).json({
      error: "Authentication required. Please sign in with a valid session.",
    });
    return;
  }

  (req as any).user = user;
  next();
}

/**
 * Express middleware requiring Founder Admin authorization.
 * Strict server-side verification:
 * - Requires a valid authenticated session
 * - Verifies user email strictly matches the founder's email address
 * - Returns safe generic error responses without exposing admin logic or secrets
 */
export async function requireFounderAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await authenticateUser(req);

  if (!user) {
    logSecurityEvent("AUTH_FAILURE", {
      ip: getClientIp(req),
      action: req.path,
      reason: "Unauthenticated attempt to access administrative endpoint",
    });

    res.status(401).json({
      authorized: false,
      error: "Authentication required. Please sign in to continue.",
    });
    return;
  }

  const founderEmail = getFounderEmail();
  const isFounder = user.email === founderEmail || user.role === "admin";

  if (!isFounder) {
    logSecurityEvent("ADMIN_ACCESS_DENIED", {
      ip: getClientIp(req),
      userId: user.id,
      email: user.email,
      action: req.path,
      reason: "User is not authorized for administrative access",
    });

    res.status(403).json({
      authorized: false,
      error: "Access denied. Administrator privileges required.",
    });
    return;
  }

  logSecurityEvent("ADMIN_ACCESS_SUCCESS", {
    ip: getClientIp(req),
    userId: user.id,
    email: user.email,
    action: req.path,
  });

  (req as any).adminUser = user;
  (req as any).user = user;
  next();
}
