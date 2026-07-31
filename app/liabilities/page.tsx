import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import LiabilitiesClient from "./LiabilitiesClient";

export default async function LiabilitiesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const [{ data: categories }, { data: liabilities }] = await Promise.all([
    supabase.from("liability_categories").select("id, name").order("id"),
    supabase
      .from("liabilities")
      .select("id, name, value, category_id, started_date, notes, owner_id, liability_categories(name), profiles(full_name)")
      .eq("household_id", profile?.household_id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <AppShell>
      <LiabilitiesClient
        categories={categories ?? []}
        liabilities={(liabilities ?? []) as any}
        currentUserId={user!.id}
      />
    </AppShell>
  );
}
