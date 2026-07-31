import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "./CategoriesClient";

export default async function LiabilityCategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("liability_categories")
    .select("id, name")
    .order("name");

  return (
    <AppShell>
      <CategoriesClient categories={categories ?? []} />
    </AppShell>
  );
}
