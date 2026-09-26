export type UserRole = "STUDENT" | "ADMIN";

export type Profile = {
  student_id: string;
  phone: string;
  profile_image: string | null;
  bio: string;
  campus_location: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  updated_at: string;
  profile: Profile | null;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type LoginResponse = AuthTokens & {
  user: User;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  student_id: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type MeUpdatePayload = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  campus_location?: string;
};

export type ApiErrorBody = {
  detail?: string;
  errors?: Record<string, unknown>;
};
