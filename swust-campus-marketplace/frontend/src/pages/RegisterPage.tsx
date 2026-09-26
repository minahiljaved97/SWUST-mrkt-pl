import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { getApiErrorMessage, getFieldErrors } from "../api/client";
import { Button, ErrorMessage, Input } from "../components";
import { useAuth } from "../features/auth/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid SWUST email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  student_id: z.string().min(1, "Student ID is required"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      student_id: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      await registerUser(values);
      navigate("/profile", { replace: true });
    } catch (error) {
      const fields = getFieldErrors(error);
      for (const [key, message] of Object.entries(fields)) {
        if (
          key === "email" ||
          key === "password" ||
          key === "first_name" ||
          key === "last_name" ||
          key === "student_id"
        ) {
          form.setError(key, { message });
        }
      }
      setFormError(getApiErrorMessage(error, "Registration failed."));
    }
  });

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create student account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Registration is limited to configured SWUST email domains.
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
          label="Student ID"
          error={form.formState.errors.student_id?.message}
          {...form.register("student_id")}
        />
        <Input
          label="First name"
          error={form.formState.errors.first_name?.message}
          {...form.register("first_name")}
        />
        <Input
          label="Last name"
          error={form.formState.errors.last_name?.message}
          {...form.register("last_name")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          Register
        </Button>
      </form>
      <p className="text-sm text-slate-600">
        Already registered?{" "}
        <Link className="underline" to="/login">
          Sign in
        </Link>
      </p>
    </section>
  );
}
