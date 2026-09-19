import crypto from "crypto";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  username: string;
  photoUrl?: string;
  provider: "google" | "email_otp";
  createdAt: number;
  lastLoginAt: number;
  role: "user" | "admin";
}

// In-memory store for registered users and username index
const usersById = new Map<string, StoredUser>();
const usersByEmail = new Map<string, StoredUser>();
const usersByUsername = new Map<string, string>(); // username -> userId

// Reserved system/admin usernames
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "meyra",
  "meyraai",
  "meyra_ai",
  "support",
  "official",
  "moderator",
  "help",
  "founder",
  "security",
  "staff",
]);

// Inappropriate words filter list (sub-strings / exact matches)
const BANNED_PATTERNS = [
  "abuse",
  "nigger",
  "faggot",
  "hitler",
  "nazi",
  "terrorist",
  "porn",
  "bitch",
  "whore",
  "asshole",
];

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.randomBytes(32).toString("hex");

// Revoked token store (for logout invalidation & session termination)
const revokedTokens = new Set<string>();

/**
 * Revokes a session token immediately on logout or security invalidation.
 */
export function revokeSessionToken(token: string): void {
  if (token && typeof token === "string") {
    revokedTokens.add(token.trim());
  }
}

/**
 * Checks if a session token has been revoked.
 */
export function isSessionTokenRevoked(token: string): boolean {
  return revokedTokens.has(token.trim());
}

/**
 * Creates a short-lived cryptographically signed email verification ticket.
 * Required by POST /api/auth/complete-profile to prove the email was verified via OTP.
 */
export function createEmailVerificationTicket(email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "MEYRA_VERIFY_TICKET" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      purpose: "complete_profile",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes validity
      nonce: crypto.randomBytes(8).toString("hex"),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies an email verification ticket and returns the verified email if valid.
 */
export function verifyEmailVerificationTicket(ticket: string): string | null {
  try {
    const parts = ticket.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature, "base64url");
    const expBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (
      !data.email ||
      data.purpose !== "complete_profile" ||
      data.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data.email as string;
  } catch {
    return null;
  }
}

/**
 * Validates a requested username according to format, length, and content rules.
 */
export function validateUsernameFormat(username: string): {
  valid: boolean;
  error?: string;
  cleanUsername?: string;
} {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username cannot be empty." };
  }

  const clean = username.trim().toLowerCase();

  if (clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long." };
  }

  if (clean.length > 24) {
    return { valid: false, error: "Username cannot exceed 24 characters." };
  }

  // Letters, numbers, underscores only
  const validCharRegex = /^[a-zA-Z0-9_]+$/;
  if (!validCharRegex.test(clean)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, and underscores (_).",
    };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return { valid: false, error: `"${clean}" is a reserved system name.` };
  }

  for (const banned of BANNED_PATTERNS) {
    if (clean.includes(banned)) {
      return { valid: false, error: "This username contains inappropriate terms." };
    }
  }

  return { valid: true, cleanUsername: clean };
}

/**
 * Checks if a username is available.
 */
export function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): {
  available: boolean;
  reason?: string;
} {
  const check = validateUsernameFormat(username);
  if (!check.valid || !check.cleanUsername) {
    return { available: false, reason: check.error };
  }

  const clean = check.cleanUsername;
  const existingUserId = usersByUsername.get(clean);

  if (existingUserId && existingUserId !== excludeUserId) {
    return { available: false, reason: `Username "@${clean}" is already taken.` };
  }

  return { available: true };
}

/**
 * Issues a cryptographically signed session token for authenticated user.
 */
export function createSessionToken(userId: string): string {
  const sid = crypto.randomBytes(16).toString("hex");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "MEYRA_JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      sid,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies a session token with timing-safe signature comparison and revocation check.
 */
export function verifySessionToken(token: string): string | null {
  try {
    if (!token || typeof token !== "string") return null;
    const cleanToken = token.trim();
    if (revokedTokens.has(cleanToken)) {
      return null;
    }

    const parts = cleanToken.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature, "base64url");
    const expBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!data.sub || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data.sub as string;
  } catch {
    return null;
  }
}

/**
 * Creates or updates an authenticated user profile with username.
 */
export function createOrUpdateUser(params: {
  email: string;
  name: string;
  username: string;
  provider: "email_otp" | "google";
  photoUrl?: string;
}): { user: StoredUser; token: string } {
  const email = params.email.trim().toLowerCase();
  const validUsername = validateUsernameFormat(params.username);
  if (!validUsername.valid || !validUsername.cleanUsername) {
    throw new Error(validUsername.error || "Invalid username format.");
  }
  const cleanUsername = validUsername.cleanUsername;

  // Check if existing user by email
  let user = usersByEmail.get(email);

  if (user) {
    // If username changed, update index
    if (user.username !== cleanUsername) {
      if (!isUsernameAvailable(cleanUsername, user.id).available) {
        throw new Error(`Username "@${cleanUsername}" is already taken.`);
      }
      usersByUsername.delete(user.username);
      usersByUsername.set(cleanUsername, user.id);
      user.username = cleanUsername;
    }
    user.name = params.name.trim() || user.name;
    user.lastLoginAt = Date.now();
    if (params.photoUrl) user.photoUrl = params.photoUrl;
  } else {
    // Check username availability
    if (!isUsernameAvailable(cleanUsername).available) {
      throw new Error(`Username "@${cleanUsername}" is already taken.`);
    }

    const userId = `usr_${crypto.randomBytes(12).toString("hex")}`;
    const isOwner = email === "himanshu22maurya22@gmail.com";

    user = {
      id: userId,
      email,
      name: params.name.trim() || "MEYRA Member",
      username: cleanUsername,
      photoUrl: params.photoUrl,
      provider: params.provider,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      role: isOwner ? "admin" : "user",
    };

    usersById.set(userId, user);
    usersByEmail.set(email, user);
    usersByUsername.set(cleanUsername, userId);
  }

  const token = createSessionToken(user.id);
  return { user, token };
}

/**
 * Gets a user by ID.
 */
export function getUserById(userId: string): StoredUser | null {
  return usersById.get(userId) || null;
}

/**
 * Gets a user by email.
 */
export function getUserByEmail(email: string): StoredUser | null {
  return usersByEmail.get(email.trim().toLowerCase()) || null;
}
