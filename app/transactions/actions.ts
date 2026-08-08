"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTransaction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum masuk.");

  const type = String(formData.get("type"));
  const amount = Number(formData.get("amount") ?? 0);
  const categoryId = Number(formData.get("category_id"));
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const assetId = String(formData.get("asset_id") ?? "").trim() || null;

  if (!["income", "expense"].includes(type) || amount <= 0 || !categoryId || !date) {
    throw new Error("Data transaksi tidak lengkap.");
  }

  const { error } = await supabase.rpc("add_transaction_with_asset_sync", {
    p_type: type,
    p_amount: amount,
    p_category_id: categoryId,
    p_date: date,
    p_description: description,
    p_asset_id: assetId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_transaction_with_asset_sync", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
