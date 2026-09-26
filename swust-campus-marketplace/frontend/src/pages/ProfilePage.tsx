import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "../api/client";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageHeader,
  Textarea,
  useToast,
} from "../components";
import { useAuth } from "../features/auth/AuthContext";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  campus_location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { pushToast } = useToast();
  const [formError, setFormError] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      bio: "",
      campus_location: "",
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    form.reset({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.profile?.phone ?? "",
      bio: user.profile?.bio ?? "",
      campus_location: user.profile?.campus_location ?? "",
    });
  }, [user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      await updateProfile(values);
      pushToast("Profile updated.", "success");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Could not update profile."));
    }
  });

  if (!user) {
    return null;
  }

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Your profile"
        description={`${user.email} · ${user.role}${
          user.profile?.student_id ? ` · ${user.profile.student_id}` : ""
        }`}
      />
      <Card>
        {formError ? <div className="mb-4"><ErrorMessage message={formError} /></div> : null}
        <form className="space-y-4" onSubmit={onSubmit}>
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
          <Input label="Phone" {...form.register("phone")} />
          <Input label="Campus / location" {...form.register("campus_location")} />
          <Textarea label="Bio" {...form.register("bio")} />
          <Button type="submit" isLoading={form.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </section>
  );
}
