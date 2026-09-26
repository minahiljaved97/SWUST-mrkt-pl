import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { getApiErrorMessage, getFieldErrors } from "../api/client";
import { Button, ErrorMessage, Input } from "../components";
import { useAuth } from "../features/auth/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      await login(values);
      const redirectTo =
        typeof location.state === "object" &&
        location.state &&
        "from" in location.state &&
        typeof location.state.from === "string"
          ? location.state.from
          : "/profile";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const fields = getFieldErrors(error);
      for (const [key, message] of Object.entries(fields)) {
        if (key === "email" || key === "password") {
          form.setError(key, { message });
        }
      }
      setFormError(getApiErrorMessage(error, "Login failed."));
    }
  });

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your SWUST student email account.
        </p>
      </div>
      {formError ? <ErrorMessage message={formError} /> : null}
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="text-sm text-slate-600">
        No account yet?{" "}
        <Link className="underline" to="/register">
          Register
        </Link>
      </p>
    </section>
  );
}
