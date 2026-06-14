"use client";

import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import PillButton from "@/components/ui/PillButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return new URLSearchParams(window.location.search).get("next") ?? "/";
  }, []);

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setIsLoading(false);
      setIsError(true);
      setMessage("Configura Supabase nelle variabili ambiente.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      setIsError(true);
      setMessage("Login non riuscito. Controlla email e password.");
      return;
    }

    window.location.href = nextPath;
  };

  const handleMagicLink = async () => {
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setIsLoading(false);
      setIsError(true);
      setMessage("Configura Supabase nelle variabili ambiente.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    setIsLoading(false);

    if (error) {
      setIsError(true);
      setMessage("Non sono riuscito a inviare il magic link.");
      return;
    }

    setMessage("Magic link inviato. Controlla la tua email.");
  };

  const handleSignup = async () => {
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setIsLoading(false);
      setIsError(true);
      setMessage("Configura Supabase nelle variabili ambiente.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    });

    setIsLoading(false);

    if (error) {
      setIsError(true);
      setMessage("Registrazione non riuscita. Usa una password più lunga o riprova.");
      return;
    }

    setMessage("Account creato. Se Supabase richiede conferma, controlla la tua email.");
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-title">Bentornato</h1>
        <p className="login-copy">
          Accedi per proporre eventi, creare club e usare gli strumenti admin quando il tuo profilo
          ha ruolo amministratore.
        </p>

        <form className="form-grid" onSubmit={handlePasswordLogin}>
          <label className="field">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <p className={`form-message ${isError ? "error" : ""}`}>{message}</p>

          <div className="auth-actions">
            <PillButton
              variant="primary"
              type="submit"
              icon={<Lock aria-hidden="true" />}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Accedi"}
            </PillButton>
            <PillButton
              variant="light"
              type="button"
              icon={<Mail aria-hidden="true" />}
              disabled={isLoading || !email}
              onClick={handleMagicLink}
            >
              Magic link
            </PillButton>
            <PillButton
              variant="coral"
              type="button"
              disabled={isLoading || !email || !password}
              onClick={handleSignup}
            >
              Crea account
            </PillButton>
            <Link href="/" className="pill-button subtle">
              Torna alla mappa
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
