import { createClient } from "@/lib/supabase/server";
import AppShellClient from "./AppShellClient";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null } | null = null;
  let household: { name: string; invite_code: string } | null = null;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, household_id")
      .eq("id", user.id)
      .single();
    profile = p;

    if (p?.household_id) {
      const { data: h } = await supabase
        .from("households")
        .select("name, invite_code")
        .eq("id", p.household_id)
        .single();
      household = h;
    }
  }

  return (
    <AppShellClient household={household} displayName={profile?.full_name ?? user?.email ?? ""}>
      {children}
    </AppShellClient>
  );
}
