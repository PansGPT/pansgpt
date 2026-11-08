/** FastAPI GET /api/v1/auth/me; authorization comes from the API, not JWT metadata. */
export interface AuthProfileResponse {
  id: string;
  email: string;
  role: string;
  roles: string[];
  university_id: string | null;
  first_name: string | null;
  last_name: string | null;
  current_level: string | null;
  terms_accepted_at: string | null;
  is_onboarded: boolean;
  client_type: string;
  dev_bypass: boolean;
}

/** FastAPI PATCH /api/v1/auth/profile payload */
export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string | null;
  current_level?: string;
}
