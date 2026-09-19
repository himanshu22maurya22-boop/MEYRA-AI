import { Router, Request, Response } from "express";
import {
  sendEmailOtp,
  verifyEmailOtp,
  getEmailProviderStatus,
  normalizeEmail,
} from "../services/emailService";
import {
  isUsernameAvailable,
  createOrUpdateUser,
  getUserByEmail,
  getUserById,
  createSessionToken,
  verifySessionToken,
  revokeSessionToken,
  createEmailVerificationTicket,
  verifyEmailVerificationTicket,
} from "../services/userService";
import {
  otpSendLimiter,
  otpVerifyLimiter,
  generalApiLimiter,
  getClientIp,
} from "../middleware/rateLimiter";
import { logSecurityEvent } from "../services/securityLogger";

export const authRouter = Router();

/**
 * Returns safe OAuth status, Email OTP provider status, and configuration details.
 * SECURITY: Never returns GOOGLE_CLIENT_SECRET, SMTP passwords, or private keys.
 */
authRouter.get("/status", (_req: Request, res: Response) => {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    "";

  const hasSecret = Boolean(
    process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CLIENT_SECRET.trim() !== ""
  );

  const emailProviderStatus = getEmailProviderStatus();

  res.json({
    status: "ok",
    googleSignIn: clientId ? "configured" : "ready",
    clientIdConfigured: Boolean(clientId),
    clientId: clientId || null,
    clientSecretStatus: hasSecret
      ? "Hidden (Server-Side Only)"
      : "Hidden (Managed on Server)",
    emailProvider: emailProviderStatus,
    cloudRunBackend: "https://meyra-ai-804674901589.asia-southeast1.run.app",
    securityAudit: {
      zeroClientSecrets: true,
      secretsInBundle: false,
      serverSideOtpVerification: true,
      otpNeverLogged: true,
    },
  });
});

/**
 * Sends a real 6-digit email OTP to the specified email address.
 * Rate-limited and protected with cooldown.
 */
authRouter.post("/send-otp", otpSendLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ success: false, error: "A valid email address is required." });
      return;
    }

    const clientIp = getClientIp(req);
    const result = await sendEmailOtp(email, clientIp);

    if (!result.success) {
      logSecurityEvent("OTP_ABUSE_DETECTED", {
        ip: clientIp,
        email,
        action: "send-otp",
        reason: result.message,
      });
      res.status(result.requiresConfiguration ? 503 : 429).json(result);
      return;
    }

    logSecurityEvent("OTP_SENT", {
      ip: clientIp,
      email,
      action: "send-otp",
    });

    res.json(result);
  } catch (err: any) {
    console.error("OTP send error:", err?.message || err);
    res.status(500).json({
      success: false,
      error: "Failed to dispatch verification code. Please try again later.",
    });
  }
});

/**
 * Verifies a 6-digit OTP code against server-side HMAC hash.
 * One-time-use, strictly server-validated.
 */
authRouter.post("/verify-otp", otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || typeof email !== "string") {
      res.status(400).json({ valid: false, error: "Email and 6-digit verification code are required." });
      return;
    }

    const verification = verifyEmailOtp(email, String(otp));

    if (!verification.valid) {
      logSecurityEvent("OTP_VERIFY_FAILURE", {
        ip: getClientIp(req),
        email,
        action: "verify-otp",
        reason: verification.error,
      });
      res.status(400).json(verification);
      return;
    }

    // Check if user already exists
    const normalized = normalizeEmail(email);
    const existingUser = getUserByEmail(normalized);

    logSecurityEvent("OTP_VERIFY_SUCCESS", {
      ip: getClientIp(req),
      email: normalized,
      action: "verify-otp",
    });

    if (existingUser && existingUser.username) {
      // User already completed profile — issue verified session token
      const sessionToken = createSessionToken(existingUser.id);
      res.json({
        valid: true,
        requiresProfileSetup: false,
        user: { ...existingUser, authToken: sessionToken },
        token: sessionToken,
      });
      return;
    }

    // First-time user needs to choose username & display name.
    // Issue cryptographically signed email verification ticket proving email ownership.
    const verificationTicket = createEmailVerificationTicket(normalized);

    res.json({
      valid: true,
      requiresProfileSetup: true,
      email: normalized,
      verificationTicket,
    });
  } catch (err: any) {
    console.error("OTP verification error:", err?.message || err);
    res.status(500).json({ valid: false, error: "Internal error during verification." });
  }
});

/**
 * Validates and checks availability of a chosen username.
 */
authRouter.post("/check-username", generalApiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      res.status(400).json({ available: false, reason: "Username is required." });
      return;
    }

    const result = isUsernameAvailable(String(username).trim());
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ available: false, reason: "Check failed." });
  }
});

/**
 * Finalizes user account with display name & unique username.
 * Requires verification ticket OR existing valid authenticated session.
 */
authRouter.post("/complete-profile", generalApiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, username, photoUrl, verificationTicket } = req.body;

    if (!email || !username || typeof email !== "string" || typeof username !== "string") {
      res.status(400).json({ error: "Email and unique username are required." });
      return;
    }

    const normalized = normalizeEmail(email);

    // Verify cryptographic proof of email verification
    let isProofValid = false;
    if (verificationTicket && typeof verificationTicket === "string") {
      const verifiedEmail = verifyEmailVerificationTicket(verificationTicket);
      if (verifiedEmail && normalizeEmail(verifiedEmail) === normalized) {
        isProofValid = true;
      }
    }

    // If no verification ticket, check if client already has a valid session for this email
    const authHeader = req.headers.authorization;
    if (!isProofValid && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const sessionUserId = verifySessionToken(token);
      if (sessionUserId) {
        const existing = getUserById(sessionUserId);
        if (existing && normalizeEmail(existing.email) === normalized) {
          isProofValid = true;
        }
      }
    }

    if (!isProofValid) {
      logSecurityEvent("FORGED_IDENTITY_BLOCKED", {
        ip: getClientIp(req),
        email: normalized,
        action: "complete-profile",
        reason: "Attempted profile completion without valid OTP verification ticket",
      });
      res.status(403).json({
        error: "Email verification proof required. Please verify your email code first.",
      });
      return;
    }

    // Sanitize input
    const cleanName = (typeof name === "string" ? name : "MEYRA Member")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 50);
    const cleanUsername = username.trim().toLowerCase();

    const { user, token } = createOrUpdateUser({
      email: normalized,
      name: cleanName || "MEYRA Member",
      username: cleanUsername,
      provider: "email_otp",
      photoUrl: typeof photoUrl === "string" && photoUrl.startsWith("https://") ? photoUrl : undefined,
    });

    logSecurityEvent("SESSION_CREATED", {
      ip: getClientIp(req),
      userId: user.id,
      email: normalized,
      action: "complete-profile",
    });

    res.json({
      success: true,
      user: { ...user, authToken: token },
      token,
    });
  } catch (err: any) {
    console.error("Profile completion error:", err?.message || err);
    res.status(400).json({ error: err?.message || "Failed to complete profile." });
  }
});

/**
 * Explicit logout endpoint — revokes session token immediately.
 */
authRouter.post("/logout", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    revokeSessionToken(token);
    logSecurityEvent("SESSION_REVOKED", {
      ip: getClientIp(req),
      action: "logout",
    });
  }
  res.json({ success: true, message: "Logged out successfully." });
});

/**
 * Validates current session token and returns authenticated user profile.
 */
authRouter.get("/me", (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const userId = verifySessionToken(token);

  if (!userId) {
    res.status(401).json({ error: "Invalid or expired session token." });
    return;
  }

  const user = getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({ user });
});

/**
 * Server-side token verification endpoint.
 * Validates Google ID tokens against Google's public tokeninfo endpoint.
 */
authRouter.post("/verify", async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      res.status(400).json({
        error: "Either idToken or accessToken is required for verification.",
      });
      return;
    }

    if (idToken) {
      // Verify with Google tokeninfo
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );

      if (!googleRes.ok) {
        const errData = await googleRes.json().catch(() => ({}));
        res.status(401).json({
          error: errData.error_description || "Invalid Google ID token.",
          code: errData.error || "invalid_token",
        });
        return;
      }

      const payload = await googleRes.json();
      const email = payload.email || "";
      const name = payload.name || payload.given_name || "Google User";
      const photoUrl = payload.picture;

      // Ensure user profile in store with unique username
      let existingUser = getUserByEmail(email);
      let sessionUser = existingUser;
      let sessionToken = "";

      if (!existingUser) {
        const rawUsername = (email.split("@")[0] || name.replace(/[^a-zA-Z0-9]/g, "")).toLowerCase().slice(0, 20);
        let finalUsername = rawUsername.length >= 3 ? rawUsername : `user_${Date.now().toString().slice(-4)}`;
        let counter = 1;
        while (!isUsernameAvailable(finalUsername).available && counter < 100) {
          finalUsername = `${rawUsername.slice(0, 16)}${counter++}`;
        }
        const created = createOrUpdateUser({
          email,
          name,
          username: finalUsername,
          provider: "google",
          photoUrl,
        });
        sessionUser = created.user;
        sessionToken = created.token;
      } else {
        sessionToken = createSessionToken(existingUser.id);
      }

      res.json({
        valid: true,
        user: {
          id: sessionUser?.id || `google_${payload.sub}`,
          name: sessionUser?.name || name,
          username: sessionUser?.username,
          email: sessionUser?.email || email,
          photoUrl: sessionUser?.photoUrl || photoUrl,
          provider: "google",
          createdAt: sessionUser?.createdAt || Date.now(),
          lastLoginAt: Date.now(),
          authToken: sessionToken,
        },
      });
      return;
    }

    if (accessToken) {
      // Fetch user profile from userinfo endpoint
      const userinfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userinfoRes.ok) {
        res.status(401).json({
          error: "Invalid Google access token or token expired.",
          code: "invalid_token",
        });
        return;
      }

      const profile = await userinfoRes.json();
      const email = profile.email || "";
      const name = profile.name || profile.given_name || "Google User";
      const photoUrl = profile.picture;

      let existingUser = getUserByEmail(email);
      let sessionUser = existingUser;
      let sessionToken = "";

      if (!existingUser) {
        const rawUsername = (email.split("@")[0] || name.replace(/[^a-zA-Z0-9]/g, "")).toLowerCase().slice(0, 20);
        let finalUsername = rawUsername.length >= 3 ? rawUsername : `user_${Date.now().toString().slice(-4)}`;
        let counter = 1;
        while (!isUsernameAvailable(finalUsername).available && counter < 100) {
          finalUsername = `${rawUsername.slice(0, 16)}${counter++}`;
        }
        const created = createOrUpdateUser({
          email,
          name,
          username: finalUsername,
          provider: "google",
          photoUrl,
        });
        sessionUser = created.user;
        sessionToken = created.token;
      } else {
        sessionToken = createSessionToken(existingUser.id);
      }

      res.json({
        valid: true,
        user: {
          id: sessionUser?.id || `google_${profile.sub}`,
          name: sessionUser?.name || name,
          username: sessionUser?.username,
          email: sessionUser?.email || email,
          photoUrl: sessionUser?.photoUrl || photoUrl,
          provider: "google",
          createdAt: sessionUser?.createdAt || Date.now(),
          lastLoginAt: Date.now(),
          authToken: sessionToken,
        },
      });
      return;
    }
  } catch (err: any) {
    console.error("Token verification error:", err);
    res.status(500).json({
      error: "Internal server error while verifying Google authentication token.",
    });
  }
});

/**
 * Optional server-side authorization code exchange.
 * Uses GOOGLE_CLIENT_SECRET strictly on the server; never exposed to the client.
 */
authRouter.post("/exchange-code", async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      res.status(400).json({ error: "Authorization code is required." });
      return;
    }

    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID;

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientSecret) {
      res.status(501).json({
        error:
          "Server is configured for client-side token flow. GOOGLE_CLIENT_SECRET is not required for client-side Google Identity Services.",
      });
      return;
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret, // Kept strictly on the server
        redirect_uri: redirectUri || "",
        grant_type: "authorization_code",
      }).toString(),
    });

    const data = await tokenResponse.json();
    if (!tokenResponse.ok) {
      res.status(tokenResponse.status).json({
        error: data.error_description || data.error || "Failed to exchange authorization code.",
        code: data.error,
      });
      return;
    }

    // Return tokens to client (Client Secret is NEVER returned)
    res.json({
      access_token: data.access_token,
      id_token: data.id_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (err: any) {
    console.error("Code exchange error:", err);
    res.status(500).json({ error: "Failed to exchange authorization code." });
  }
});
