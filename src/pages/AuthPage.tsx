import { useState } from "react";
import { signInWithGoogle, signIn, signUp } from "../lib/auth";
import { Loader2, ChevronDown } from "lucide-react";

type EmailMode = "signin" | "signup";

export default function AuthPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setError(res.error.message);
        setGoogleLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    try {
      if (emailMode === "signup") {
        const res = await signUp(email, password, fullName);
        if (res.error) throw res.error;
        setError("Check your email for a confirmation link, then sign in.");
        setEmailMode("signin");
      } else {
        const res = await signIn(email, password);
        if (res.error) throw res.error;
        // AuthContext onAuthStateChange handles the redirect
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Check credentials.");
    } finally {
      setEmailLoading(false);
    }
  }

  const inputCls =
    "w-full h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground/50";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-bg, #F7F6F3)" }}
    >
      {/* Brand mark */}
      <div className="mb-12 text-center select-none">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[14px] bg-foreground/5 border border-foreground/8 mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-foreground/70">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.8"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.8"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5"/>
          </svg>
        </div>
        <h1
          className="text-[28px] font-bold tracking-tight text-foreground leading-none"
          style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.04em" }}
        >
          THOTH
        </h1>
        <p className="text-[12px] text-muted-foreground/70 mt-2 tracking-wide uppercase" style={{ letterSpacing: "0.1em" }}>
          Intelligent Operating System
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-[340px]">
        <div className="bg-background/80 border border-border/50 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden backdrop-blur-sm">
          <div className="px-7 py-8">
            <p
              className="text-[15px] font-semibold text-foreground mb-1 text-center"
              style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
            >
              Sign in to your workspace
            </p>
            <p className="text-[12px] text-muted-foreground/60 mb-7 text-center">
              Continue with your Google account
            </p>

            {/* ── Google (primary) ── */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border/60 bg-background text-[13px] font-medium text-foreground hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            >
              {googleLoading ? (
                <Loader2 size={15} className="animate-spin text-muted-foreground" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {googleLoading ? "Signing in…" : "Continue with Google"}
            </button>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* ── Email/password toggle (temp testing) ── */}
            <button
              type="button"
              onClick={() => { setEmailOpen((v) => !v); setError(null); }}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border/50 bg-muted/30 text-[12px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              Continue with email
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${emailOpen ? "rotate-180" : ""}`}
              />
            </button>

            {emailOpen && (
              <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3">
                {emailMode === "signup" && (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className={inputCls}
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className={inputCls}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={emailLoading || !email || !password}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {emailLoading && <Loader2 size={13} className="animate-spin" />}
                  {emailMode === "signup" ? "Create account" : "Sign in"}
                </button>
                <p className="text-center text-[11px] text-muted-foreground/60">
                  {emailMode === "signup" ? (
                    <>Have an account?{" "}
                      <button type="button" onClick={() => { setEmailMode("signin"); setError(null); }}
                        className="underline underline-offset-2 hover:text-foreground transition-colors">
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>No account?{" "}
                      <button type="button" onClick={() => { setEmailMode("signup"); setError(null); }}
                        className="underline underline-offset-2 hover:text-foreground transition-colors">
                        Create one
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}

            {error && (
              <p className="mt-4 text-[11.5px] text-rose-500 text-center">{error}</p>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-7 tracking-wide">
          THOTH · All rights reserved
        </p>
      </div>
    </div>
  );
}
