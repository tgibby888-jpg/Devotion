import { createServerFn } from "@tanstack/react-start";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query, esc } from "~/utils/db";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  const salt = parts[0];
  const hash = parts.slice(1).join(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
  } catch {
    return false;
  }
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function serializeCookie(name: string, value: string, opts: Record<string, any>): string {
  let cookie = name + "=" + value;
  if (opts.httpOnly) cookie += "; HttpOnly";
  if (opts.secure) cookie += "; Secure";
  if (opts.sameSite) cookie += "; SameSite=" + opts.sameSite;
  if (opts.path) cookie += "; Path=" + opts.path;
  if (opts.maxAge) cookie += "; Max-Age=" + opts.maxAge;
  return cookie;
}

function getCookie(name: string, cookieHeader: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.substring(0, eq).trim() === name) {
      return part.substring(eq + 1).trim();
    }
  }
  return null;
}

export const getCurrentUser = createServerFn({ method: "GET" })
  .handler(async () => {
    const { event } = await import("@tanstack/react-start");
    const cookieHeader = event.request.headers.get("cookie") || "";
    const token = getCookie("devotion_session", cookieHeader);
    if (!token) return { user: null };

    const rows = await query("SELECT user_id FROM auth_tokens WHERE token = '" + esc(token) + "' AND expires_at > datetime('now')");
    if (rows && rows.length > 0) {
      const uid = rows[0].user_id;
      const uRows = await query("SELECT id, email, display_name, tier FROM users WHERE id = '" + uid + "'");
      if (uRows && uRows.length > 0) return { user: uRows[0] };
    }
    return { user: null };
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; displayName: string }) => data)
  .handler(async ({ data }) => {
    const { email, password, displayName } = data;
    if (!email || !password || password.length < 6) {
      return { error: "Invalid email or password (min 6 chars)" };
    }

    const existingRows = await query("SELECT id FROM users WHERE email = '" + esc(email) + "'");
    if (existingRows.length > 0) return { error: "Email already registered" };

    const passwordHash = hashPassword(password);
    const resultRows = await query("INSERT INTO users (email, password_hash, display_name) VALUES ('" + esc(email) + "', '" + esc(passwordHash) + "', '" + esc(displayName) + "') RETURNING id");

    let userId = "";
    if (resultRows && resultRows.length > 0) userId = resultRows[0].id || "";

    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await query("INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ('" + esc(token) + "', '" + userId + "', '" + expires + "')");

    const cookie = serializeCookie("devotion_session", token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, cookie, userId };
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;
    const rows = await query("SELECT id, password_hash, display_name, tier FROM users WHERE email = '" + esc(email) + "'");

    let user: any = null;
    if (rows && rows.length > 0) user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return { error: "Invalid email or password" };
    }

    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await query("INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ('" + esc(token) + "', '" + user.id + "', '" + expires + "')");

    const cookie = serializeCookie("devotion_session", token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, cookie, user: { id: user.id, displayName: user.display_name, tier: user.tier } };
  });

export const logoutFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const { event } = await import("@tanstack/react-start");
    const cookieHeader = event.request.headers.get("cookie") || "";
    const token = getCookie("devotion_session", cookieHeader);
    if (token) {
      await query("DELETE FROM auth_tokens WHERE token = '" + esc(token) + "'");
    }

    const cookie = serializeCookie("devotion_session", "", {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0,
    });

    return { success: true, cookie };
  });