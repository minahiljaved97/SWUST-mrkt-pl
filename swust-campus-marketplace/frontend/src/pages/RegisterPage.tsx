import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { getApiErrorMessage, getFieldErrors } from "../api/client";
import { Button, Card, ErrorMessage, Input, PageHeader, useToast } from "../components";
import { useAuth } from "../features/auth/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  student_id: z.string().min(1, "Student ID is required"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
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
      pushToast("Account created. Welcome to the marketplace.", "success");
      navigate("/marketplace", { replace: true });
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
      <PageHeader
        title="Create student account"
        description="Use any email address to create your marketplace account."
      />
      <Card>
        {formError ? <div className="mb-4"><ErrorMessage message={formError} /></div> : null}
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
          <Button type="submit" className="w-full" isLoading={form.formState.isSubmitting}>
            Register
          </Button>
        </form>
      </Card>
      <p className="text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-medium text-brand-700 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </section>
  );
}
