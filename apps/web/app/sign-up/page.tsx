"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { space_name: spaceName.trim() } },
    });
    if (err) setError(err.message);
    else router.push("/dashboard");
  }

  return (
    <main className="container" style={{ padding: "80px 0", maxWidth: 420 }}>
      <h1>Create your account</h1>
      <p className="muted">We&apos;ll create a space for you. You can rename it any time.</p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8)" required minLength={8} style={inputStyle} />
        <input type="text" value={spaceName} onChange={(e) => setSpaceName(e.target.value)} placeholder="Space name (optional)" maxLength={64} style={inputStyle} />
        {error ? <p style={{ color: "var(--negative)" }}>{error}</p> : null}
        <button className="btn btn-primary" type="submit">Sign up</button>
      </form>
      <p className="muted" style={{ marginTop: 24 }}>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 16,
};
