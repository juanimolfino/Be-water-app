"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [loading, setLoading] = useState(false);

  async function signInWithMagicLink(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/callback` }
    });
    setLoading(false);
    setMessage(error ? error.message : "Check your email for the magic link.");
  }

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function signInWithGoogle() {
    window.location.href = "/login/google";
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={mode === "magic" ? "font-semibold underline" : "text-muted-foreground"}
        >
          Dueño de centro
        </button>
        <span className="text-muted-foreground">/</span>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={mode === "password" ? "font-semibold underline" : "text-muted-foreground"}
        >
          Vendedor
        </button>
      </div>

      {mode === "magic" ? (
        <>
          <form onSubmit={signInWithMagicLink} className="space-y-4">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              <Mail className="h-4 w-4" />
              {loading ? "Sending..." : "Send magic link"}
            </Button>
          </form>
          <div className="my-4 h-px bg-border" />
          <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
        </>
      ) : (
        <form onSubmit={signInWithPassword} className="space-y-4">
          <Input
            type="email"
            required
            placeholder="tu-email@centro.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            <KeyRound className="h-4 w-4" />
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      )}
      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
