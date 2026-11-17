"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { initialState } from "@/lib/actions/types";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next }: { next?: string | undefined }) {
  const [state, action] = useActionState(loginAction, initialState);
  // Email dikontrol agar tidak terhapus saat login gagal (React mereset field tak-terkontrol).
  const [email, setEmail] = useState("");
  const [lihat, setLihat] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email" name="email" type="email" autoComplete="username" inputMode="email"
          autoCapitalize="none" spellCheck={false} placeholder="nama@sekolah.sch.id" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!state.errors?.email} aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={state.errors?.password}>
        <div className="relative">
          <Input
            id="password" name="password" type={lihat ? "text" : "password"} autoComplete="current-password"
            placeholder="Masukkan password" required className="pr-11"
            aria-invalid={!!state.errors?.password} aria-describedby={state.errors?.password ? "password-error" : undefined}
          />
          <button
            type="button" onClick={() => setLihat((v) => !v)} aria-pressed={lihat}
            aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[10px] text-ink-2 hover:text-ink focus-visible:outline-2"
          >
            {lihat ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
          </button>
        </div>
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="accent" className="h-11 w-full" pendingText="Memeriksa…">Masuk</SubmitButton>
    </form>
  );
}
