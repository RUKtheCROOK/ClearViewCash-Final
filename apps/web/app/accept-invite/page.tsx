"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { claimInvitation } from "@cvc/api-client";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

type Status = "checking" | "needs-auth" | "claiming" | "success" | "error";

function AcceptInviteInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
  }, []);

  const deepLink = token
    ? `clearviewcash://accept-invite?token=${encodeURIComponent(token)}`
    : null;

  const attemptClaim = useCallback(async () => {
    setStatus("claiming");
    setMessage("");
    try {
      const result = await claimInvitation(supabase, token);
      setStatus("success");
      setMessage(
        result.already
          ? "You were already a member of this space."
          : "You're in. Open the app to start using your shared space.",
      );
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message ?? "Could not accept invite.");
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This page expects a token in the URL — for example, /accept-invite?token=abc123.");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        attemptClaim();
      } else {
        setStatus("needs-auth");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, attemptClaim]);

  async function onAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (authMode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }
      if (!data.session) {
        // Email confirmation required by project config.
        setStatus("error");
        setMessage(
          "Check your email to confirm your account, then come back to this link to finish joining the space.",
        );
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }
    }
    await attemptClaim();
  }

  return (
    <main className="container" style={{ padding: "80px 0", maxWidth: 460 }}>
      <h1>Accept invite</h1>

      {isMobile && deepLink ? (
        <div className="card" style={{ marginTop: 16, marginBottom: 24 }}>
          <p style={{ margin: 0, marginBottom: 12 }}>
            <strong>Have the app installed?</strong>
          </p>
          <a className="btn btn-primary" href={deepLink} style={{ width: "100%" }}>
            Open in ClearViewCash app
          </a>
          <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
            Or finish in your browser below.
          </p>
        </div>
      ) : null}

      {status === "checking" ? <p className="muted">Checking your session…</p> : null}

      {status === "claiming" ? <p className="muted">Joining the space…</p> : null}

      {status === "needs-auth" ? (
        <>
          <p className="muted" style={{ marginBottom: 24 }}>
            {authMode === "sign-up"
              ? "Create an account to accept this invite. You'll land directly in the shared space."
              : "Sign in to accept this invite."}
          </p>
          <form
            onSubmit={onAuthSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={inputStyle}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === "sign-up" ? "Password (min 8)" : "Password"}
              required
              minLength={authMode === "sign-up" ? 8 : undefined}
              style={inputStyle}
            />
            {message ? <p style={{ color: "var(--negative)", margin: 0 }}>{message}</p> : null}
            <button className="btn btn-primary" type="submit">
              {authMode === "sign-up" ? "Create account & join" : "Sign in & join"}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 24 }}>
            {authMode === "sign-up" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setAuthMode("sign-in")} style={linkButtonStyle}>
                  Sign in instead
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button onClick={() => setAuthMode("sign-up")} style={linkButtonStyle}>
                  Create an account
                </button>
              </>
            )}
          </p>
        </>
      ) : null}

      {status === "success" ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0, marginBottom: 16, color: "var(--positive)", fontWeight: 600 }}>
            {message}
          </p>
          {deepLink ? (
            <a
              className="btn btn-primary"
              href={deepLink}
              style={{ width: "100%", marginBottom: 12 }}
            >
              Open in the app
            </a>
          ) : null}
          <Link className="btn btn-secondary" href="/" style={{ width: "100%" }}>
            Back to home
          </Link>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0, marginBottom: 16, color: "var(--negative)" }}>{message}</p>
          <Link className="btn btn-secondary" href="/" style={{ width: "100%" }}>
            Back to home
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="container" style={{ padding: "80px 0", maxWidth: 460 }}>
          <h1>Accept invite</h1>
          <p className="muted">Loading…</p>
        </main>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 16,
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--primary)",
  cursor: "pointer",
  padding: 0,
  font: "inherit",
};
