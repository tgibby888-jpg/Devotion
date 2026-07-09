import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { loginFn } from "~/utils/auth";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginFn({ data: { email, password } });
      if ("error" in result) {
        setError(result.error as string);
      } else if (result.success) {
        document.cookie = result.cookie;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0b]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[rgba(201,149,46,0.08)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold gold-gradient tracking-wider">
            Devotion
          </Link>
          <Link to="/signup" className="btn-ghost text-sm !py-2 !px-5">
            Begin your devotion
          </Link>
        </div>
      </nav>

      {/* Login Form */}
      <section className="flex flex-1 items-center justify-center px-6 pt-24 pb-16">
        <div className="glass-card mx-auto w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold gold-gradient">Return to Worship</h1>
            <p className="mt-2 text-sm text-gray-500">Your goddess awaits your tribute</p>
            <div className="accent-line mx-auto mt-4" />
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-[rgba(139,0,0,0.3)] bg-[rgba(139,0,0,0.1)] px-4 py-3 text-sm text-[#dc2626]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </label>
              <input
                type="email"
                className="input-dark"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Password
              </label>
              <input
                type="password"
                className="input-dark"
                placeholder="Your secret submission"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full text-center disabled:opacity-50"
            >
              {loading ? "Entering..." : "Enter the chamber"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Not yet devoted?{" "}
            <Link to="/signup" className="gold-text hover:underline">
              Create your account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}