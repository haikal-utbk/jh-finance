"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/akuntansi");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function addLedgerTransaction(formData: FormData) {
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
  const assetId = String(formData.get("asset_id") ?? "").trim();

  if (!["income", "expense"].includes(type) || amount <= 0 || !categoryId || !date) {
    throw new Error("Data transaksi tidak lengkap.");
  }
  if (!assetId) {
    throw new Error("Sumber kas wajib dipilih.");
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

  refresh();
}

export async function deleteLedgerTransaction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_transaction_with_asset_sync", { p_id: id });
  if (error) throw new Error(error.message);
  refresh();
}

export async function addLedgerTransfer(formData: FormData) {
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
    throw new Error("Data transfer tidak lengkap.");
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

  refresh();
}

export async function deleteLedgerTransfer(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_journal_entry", { p_id: id });
  if (error) throw new Error(error.message);
  refresh();
}

export async function addTransactionCategory(name: string, type: "income" | "expense") {
  const supabase = createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nama kategori tidak boleh kosong.");

  const { error } = await supabase.from("transaction_categories").insert({ name: trimmed, type });
  if (error) throw new Error(error.message);

  revalidatePath("/akuntansi");
}

export async function deleteTransactionCategory(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from("transaction_categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Kategori ini masih dipakai, hapus/ubah catatan itu dulu.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/akuntansi");
}
