"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTransaction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum masuk.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();
  if (!profile?.household_id) throw new Error("Belum tergabung dalam keluarga.");

  const type = String(formData.get("type"));
  const amount = Number(formData.get("amount") ?? 0);
  const categoryId = Number(formData.get("category_id"));
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!["income", "expense"].includes(type) || amount <= 0 || !categoryId || !date) {
    throw new Error("Data transaksi tidak lengkap.");
  }

  const { error } = await supabase.from("transactions").insert({
    household_id: profile.household_id,
    user_id: user.id,
    category_id: categoryId,
    type,
    amount,
    date,
    description,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("transactions").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Kamu tidak punya izin menghapus transaksi ini.");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
