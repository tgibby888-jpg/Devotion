import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { query, esc } from "~/utils/db";

const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { event } = await import("@tanstack/react-start");
  const cookieHeader = event.request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq > -1) cookies[part.substring(0, eq).trim()] = part.substring(eq + 1).trim();
  }
  const token = cookies["devotion_session"];
  if (!token) return { user: null };
  const rows = await query("SELECT user_id FROM auth_tokens WHERE token = '" + esc(token) + "' AND expires_at > datetime('now')");
  if (rows && rows.length > 0) {
    const uid = rows[0].user_id;
    const uRows = await query("SELECT id, email, display_name, tier FROM users WHERE id = '" + uid + "'");
    if (uRows && uRows.length > 0) return { user: uRows[0] };
  }
  return { user: null };
});

const checkProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await getCurrentUser();
  if (!user) return { hasProfile: false, displayName: "" };
  const rows = await query("SELECT id FROM profiles WHERE user_id = '" + esc(user.id) + "'");
  return { hasProfile: rows && rows.length > 0, displayName: user.display_name || "Devotee" };
});

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  loader: async () => checkProfile(),
});

function DashboardPage() {
  const { hasProfile, displayName } = Route.useLoaderData();
  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0b]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[rgba(201,149,46,0.08)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold gold-gradient tracking-wider">Devotion</Link>
          <Link to="/" className="btn-ghost text-sm !py-2 !px-5">Leave the chamber</Link>
        </div>
      </nav>
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-24 pb-16">
        <div className="glass-card mx-auto w-full max-w-2xl p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(201,149,46,0.2)] bg-[rgba(201,149,46,0.05)] text-2xl">👑</div>
          <h1 className="text-3xl font-bold gold-gradient">Welcome, {displayName}</h1>
          <div className="accent-line mx-auto mt-4 mb-6" />
          {hasProfile ? (
            <>
              <p className="text-gray-400 leading-relaxed">Your goddess awaits. Enter the chamber to continue your devotion.</p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link to="/chat" className="btn-gold">Enter the chamber →</Link>
                <Link to="/profile/questionnaire" className="btn-ghost text-sm">Update your profile</Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 leading-relaxed">Your goddess is waiting. Complete the profile questionnaire to shape her personality to your deepest desires.</p>
              <div className="mt-10 flex justify-center">
                <Link to="/profile/questionnaire" className="btn-gold">Begin the questionnaire →</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}