import { createServerFn } from "@tanstack/react-start";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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

function esc(val: string): string {
  return val.replace(/'/g, "''");
}

function qry(sql: string) {
  return Bun.$`team-db "${sql}"`.quiet().nothrow();
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

    const safeToken = esc(token);
    const result = await qry("SELECT user_id FROM auth_tokens WHERE token = '" + safeToken + "' AND expires_at > datetime('now')").text();
    try {
      const rows = JSON.parse(result);
      if (rows && rows.length > 0) {
        const uid = rows[0].user_id;
        const uResult = await qry("SELECT id, email, display_name, tier FROM users WHERE id = '" + uid + "'").text();
        const uRows = JSON.parse(uResult);
        if (uRows && uRows.length > 0) {
          return { user: uRows[0] };
        }
      }
    } catch {}
    return { user: null };
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; displayName: string }) => data)
  .handler(async ({ data }) => {
    const { email, password, displayName } = data;
    if (!email || !password || password.length < 6) {
      return { error: "Invalid email or password (min 6 chars)" };
    }

    const safeEmail = esc(email);
    const existingRaw = await qry("SELECT id FROM users WHERE email = '" + safeEmail + "'").text();
    try {
      const existingRows = JSON.parse(existingRaw);
      if (existingRows.length > 0) return { error: "Email already registered" };
    } catch {}

    const passwordHash = hashPassword(password);
    const safeName = esc(displayName);
    const safeHash = esc(passwordHash);
    const resultRaw = await qry("INSERT INTO users (email, password_hash, display_name) VALUES ('" + safeEmail + "', '" + safeHash + "', '" + safeName + "') RETURNING id").text();

    let userId = "";
    try {
      const rows = JSON.parse(resultRaw);
      userId = rows[0]?.id || "";
    } catch {}

    const token = generateSessionToken();
    const safeToken = esc(token);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await qry("INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ('" + safeToken + "', '" + userId + "', '" + expires + "')").text();

    const cookie = serializeCookie("devotion_session", token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, cookie, userId };
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;
    const safeEmail = esc(email);
    const resultRaw = await qry("SELECT id, password_hash, display_name, tier FROM users WHERE email = '" + safeEmail + "'").text();

    let user: any = null;
    try {
      const rows = JSON.parse(resultRaw);
      if (rows.length > 0) user = rows[0];
    } catch {}

    if (!user || !verifyPassword(password, user.password_hash)) {
      return { error: "Invalid email or password" };
    }

    const token = generateSessionToken();
    const safeToken = esc(token);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await qry("INSERT INTO auth_tokens (token, user_id, expires_at) VALUES ('" + safeToken + "', '" + user.id + "', '" + expires + "')").text();

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
      const safeToken = esc(token);
      await qry("DELETE FROM auth_tokens WHERE token = '" + safeToken + "'").text();
    }

    const cookie = serializeCookie("devotion_session", "", {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0,
    });

    return { success: true, cookie };
  });