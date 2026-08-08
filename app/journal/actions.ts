"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addJournalEntry(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum masuk.");

  const fromAssetId = String(formData.get("from_asset_id") ?? "").trim();
  const toAssetId = String(formData.get("to_asset_id") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!fromAssetId || !toAssetId || amount <= 0 || !date) {
    throw new Error("Data jurnal tidak lengkap.");
  }
  if (fromAssetId === toAssetId) {
    throw new Error("Aset asal dan tujuan tidak boleh sama.");
  }

  const { error } = await supabase.rpc("add_journal_entry", {
    p_from_asset_id: fromAssetId,
    p_to_asset_id: toAssetId,
    p_amount: amount,
    p_description: description,
    p_date: date,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

export async function deleteJournalEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_journal_entry", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}
