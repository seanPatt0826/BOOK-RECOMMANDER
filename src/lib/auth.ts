import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** The signed-in Supabase user, or null when logged out. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
