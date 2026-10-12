"use client";

import { useMutation } from "@tanstack/react-query";
import { LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Routes } from "@/constants/routes";
import { type SignInInput, signInSchema } from "@/schemas/auth";

type FieldErrors = Partial<Record<keyof SignInInput, string>>;

/**
 * Renders the email + password sign-in screen. Mounted by
 * `src/app/login/page.tsx`; signed-in visitors never reach it because
 * `src/proxy.ts` redirects them home. There is no self-service registration;
 * accounts are created in Supabase.
 *
 * @remarks
 * Status: stable — Type: feature
 *
 * State & behavior: owns the two field values and per-field validation
 * errors. Submitting validates with `signInSchema`, then calls
 * `signInWithPassword` through a TanStack mutation. Success replaces the
 * route with `Routes.HOME` and refreshes so the proxy sees the new cookie.
 *
 * Variants: none.
 *
 * Composition: no props, no children. Needs `QueryProvider` above it for
 * `useMutation` and `PaletteProvider` for the `--app-*` colours.
 *
 * Accessibility: native `<form>`, so Enter submits. Each field has a
 * `<label htmlFor>`; an invalid field sets `aria-invalid` and points
 * `aria-describedby` at its error line. The server error is `role="alert"`.
 * Inputs are disabled while the request is in flight.
 *
 * Test ids: form `login-form`, email `login-email-input`, password
 * `login-password-input`, field errors `login-email-error-message` /
 * `login-password-error-message`, server error `login-error-message`,
 * submit `login-submit-button`.
 *
 * CSS classes: `login` (root block), `login__panel`, `login__header`,
 * `login__eyebrow`, `login__title`, `login__subtitle`, `login__form`,
 * `login__field`, `login__label`, `login__input`, `login__field-error`, `login__message`
 * with `login__message--error`, `login__submit`.
 *
 * Edge cases:
 * - Supabase rejects the credentials → its message shows in the error box,
 *   field values are kept.
 * - Missing `NEXT_PUBLIC_SUPABASE_*` env vars → the Supabase client throws
 *   on first submit.
 *
 * Dependencies: `@tanstack/react-query`, `@supabase/ssr` via
 * `getSupabaseBrowser`, `lucide-react`, compacto-ui `Button` and `Input`.
 *
 * @example
 * ```tsx
 * <Login />
 * ```
 */
export default function Login() {
  const router = useRouter();
  const ids = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const auth = useMutation({
    mutationFn: async (input: SignInInput) => {
      const { error } = await getSupabaseBrowser().auth.signInWithPassword(input);
      if (error) throw error;
    },
    onSuccess: () => {
      router.replace(Routes.HOME);
      router.refresh();
    },
  });

  const emailErrorId = `${ids}-email-error`;
  const passwordErrorId = `${ids}-password-error`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    auth.reset();

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SignInInput;
        next[key] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    auth.mutate(parsed.data);
  }

  return (
    <main className="login">
      <section className="login__panel" aria-labelledby={`${ids}-title`}>
        <header className="login__header">
          <span className="login__eyebrow">Ferry Track</span>
          <h1 id={`${ids}-title`} className="login__title">
            Sign in
          </h1>
          <p className="login__subtitle">Log your morning and evening ferry legs.</p>
        </header>

        <form className="login__form" onSubmit={handleSubmit} noValidate data-testid="login-form">
          {auth.error && (
            <p className="login__message login__message--error" role="alert" data-testid="login-error-message">
              {auth.error.message}
            </p>
          )}

          <div className="login__field">
            <label htmlFor={`${ids}-email`} className="login__label">
              Email
            </label>
            <Input
              id={`${ids}-email`}
              className="login__input"
              type="email"
              autoComplete="email"
              icon={Mail}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={auth.isPending}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? emailErrorId : undefined}
              data-testid="login-email-input"
            />
            {fieldErrors.email && (
              <p id={emailErrorId} className="login__field-error" data-testid="login-email-error-message">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="login__field">
            <label htmlFor={`${ids}-password`} className="login__label">
              Password
            </label>
            <Input
              id={`${ids}-password`}
              className="login__input"
              type="password"
              autoComplete="current-password"
              icon={LockKeyhole}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={auth.isPending}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
              data-testid="login-password-input"
            />
            {fieldErrors.password && (
              <p id={passwordErrorId} className="login__field-error" data-testid="login-password-error-message">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="login__submit"
            disabled={auth.isPending}
            data-testid="login-submit-button"
          >
            {auth.isPending ? "Please wait…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
