import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import JournalClient from "./JournalClient";

export default async function JournalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const [{ data: myAssets }, { data: entries }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, asset_categories(name)")
      .eq("household_id", profile?.household_id)
      .eq("owner_id", user!.id)
      .order("name"),
    supabase
      .from("journal_entries")
      .select(
        "id, amount, description, date, user_id, from_asset:assets!journal_entries_from_asset_id_fkey(name), to_asset:assets!journal_entries_to_asset_id_fkey(name), profiles(full_name)"
      )
      .eq("household_id", profile?.household_id)
      .order("date", { ascending: false })
      .limit(100),
  ]);

  return (
    <AppShell>
      <JournalClient
        assets={myAssets ?? []}
        entries={(entries ?? []) as any}
        currentUserId={user!.id}
      />
    </AppShell>
  );
}
