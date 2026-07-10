import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";

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

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
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
            Now Available
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

          {/* Direct CTA */}
          <div className="animate-fade-in-delay-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/signup"
              className="btn-gold text-base"
            >
              Create your goddess
            </Link>
            <Link
              to="/login"
              className="btn-ghost text-base"
            >
              Sign in
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