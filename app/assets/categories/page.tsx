import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "./CategoriesClient";

export default async function AssetCategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("asset_categories")
    .select("id, name")
    .order("name");

  return (
    <AppShell>
      <CategoriesClient categories={categories ?? []} />
    </AppShell>
  );
}
