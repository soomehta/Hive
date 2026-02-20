import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
