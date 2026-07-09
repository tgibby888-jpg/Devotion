import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState } from "react";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "Devotion";
  } catch {
    return "Devotion";
  }
});

const waitlistFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const { email } = data;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email address" };
    }

    const safeEmail = email.replace(/'/g, "''");
    const result = await Bun.$`team-db "INSERT INTO waitlist (email) VALUES ('${safeEmail}')"`.quiet().nothrow().text();

    // If the insert succeeded (no error), or if it failed because the email already exists
    if (result && result.includes("UNIQUE constraint failed")) {
      return { error: "You're already on the waitlist!" };
    }

    return { success: true };
  });

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistMessage, setWaitlistMessage] = useState("");

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistStatus("loading");
    setWaitlistMessage("");

    try {
      const result = await waitlistFn({ data: { email } });
      if ("error" in result) {
        setWaitlistStatus("error");
        setWaitlistMessage(result.error as string);
      } else {
        setWaitlistStatus("success");
        setWaitlistMessage("You're on the list. Your goddess will find you soon.");
        setEmail("");
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0b]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[rgba(201,149,46,0.08)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold gold-gradient tracking-wider">
            {businessName}
          </span>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-gold-400 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="btn-ghost text-sm !py-2 !px-5"
            >
              Create account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-6 pt-24 pb-16">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-[rgba(201,149,46,0.03)] blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <span className="animate-fade-in inline-block rounded-full border border-[rgba(201,149,46,0.2)] bg-[rgba(201,149,46,0.05)] px-4 py-1.5 text-xs font-medium tracking-widest uppercase gold-text">
            Early Access
          </span>

          <h1 className="animate-fade-in-delay-1 mt-10 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            <span className="gold-gradient">Your AI Goddess.</span>
            <br />
            <span className="text-white/90">Always in character.</span>
          </h1>

          <p className="animate-fade-in-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Create a deeply personalized dominatrix companion who{" "}
            <span className="gold-text">knows</span> your limits,{" "}
            <span className="gold-text">commands</span> your devotion, and{" "}
            <span className="gold-text">stays</span> in character — 24/7. No
            ghosting. No unpredictability. Pure, authentic findom.
          </p>

          {/* Waitlist Email Capture */}
          <div className="animate-fade-in-delay-3 mx-auto mt-10 max-w-md">
            {waitlistStatus === "success" ? (
              <div className="rounded-lg border border-[rgba(201,149,46,0.2)] bg-[rgba(201,149,46,0.05)] px-6 py-4">
                <p className="gold-text text-sm">{waitlistMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for early access"
                  className="input-dark flex-1 text-center sm:text-left"
                  required
                  disabled={waitlistStatus === "loading"}
                />
                <button
                  type="submit"
                  disabled={waitlistStatus === "loading"}
                  className="btn-gold whitespace-nowrap disabled:opacity-50"
                >
                  {waitlistStatus === "loading" ? "Joining..." : "Join waitlist"}
                </button>
              </form>
            )}

            {waitlistStatus === "error" && (
              <p className="mt-3 text-xs text-[#dc2626]">{waitlistMessage}</p>
            )}
          </div>

          <div className="animate-fade-in-delay-3 mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/signup"
              className="btn-ghost text-sm"
            >
              Or create your full account →
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-8 w-[1px] bg-gradient-to-b from-[rgba(201,149,46,0.5)] to-transparent" />
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-32">
        <div className="divider-gold mb-20" />

        <div className="grid gap-8 md:grid-cols-3">
          <div className="animate-fade-in glass-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(201,149,46,0.2)] bg-[rgba(201,149,46,0.05)] text-xl">
              👑
            </div>
            <h3 className="mb-3 text-lg font-semibold gold-text">
              Perfectly Personalized
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              A multi-step profile questionnaire learns your kinks, limits, and
              preferences. Your goddess is forged from your submission.
            </p>
          </div>

          <div className="animate-fade-in glass-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(201,149,46,0.2)] bg-[rgba(201,149,46,0.05)] text-xl">
              ⚡
            </div>
            <h3 className="mb-3 text-lg font-semibold gold-text">
              24/7 Presence
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              She never sleeps, never has a bad day, and never loses your trust.
              Consistent, demanding, always in character.
            </p>
          </div>

          <div className="animate-fade-in glass-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(201,149,46,0.2)] bg-[rgba(201,149,46,0.05)] text-xl">
              🔒
            </div>
            <h3 className="mb-3 text-lg font-semibold gold-text">
              Total Discretion
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Your privacy is absolute. Secure, anonymous, with no human
              involvement tracking your sessions.
            </p>
          </div>
        </div>

        <div className="animate-fade-in-delay-2 mt-20 text-center">
          <div className="glass-card mx-auto inline-block px-8 py-6">
            <p className="text-sm text-gray-500">
              Four tiers of devotion · Bronze · Silver · Gold · Platinum
            </p>
            <div className="accent-line mx-auto mt-4" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(201,149,46,0.08)] px-6 py-8 text-center text-sm text-gray-600">
        <p>
          © {new Date().getFullYear()} {businessName}. Consenting adults only.
        </p>
        <p className="mt-1 text-xs text-gray-700">
          Built with{" "}
          <a
            href="https://cto.new"
            className="underline hover:text-gray-500 transition-colors"
          >
            cto.new
          </a>
        </p>
      </footer>
    </main>
  );
}