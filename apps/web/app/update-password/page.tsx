import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
export default async function UpdatePasswordPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/forgot-password?error=recovery_required");
  return <UpdatePasswordForm />;
}
