import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import AssetsClient from "./AssetsClient";

export default async function AssetsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const [{ data: categories }, { data: assets }] = await Promise.all([
    supabase.from("asset_categories").select("id, name").order("id"),
    supabase
      .from("assets")
      .select("id, name, value, category_id, acquired_date, notes, owner_id, asset_categories(name), profiles(full_name)")
      .eq("household_id", profile?.household_id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <AppShell>
      <AssetsClient
        categories={categories ?? []}
        assets={(assets ?? []) as any}
        currentUserId={user!.id}
      />
    </AppShell>
  );
}
