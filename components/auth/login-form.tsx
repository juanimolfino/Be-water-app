"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [loading, setLoading] = useState(false);

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

  return (
    <form onSubmit={signInWithPassword} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-[13px] font-bold text-foreground">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-sea" strokeWidth={1.8} />
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nombre@bewaterdiving.com"
            className="h-[50px] pl-11"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-[13px] font-bold text-foreground">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-sea" strokeWidth={1.8} />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••••"
            className="h-[50px] px-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-sea"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Ingresando..." : "Entrar al panel"}
        {!loading ? <ArrowRight className="h-5 w-5" strokeWidth={2.4} /> : null}
      </Button>
    </form>
  );
}
