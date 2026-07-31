"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addAsset(formData: FormData) {
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

  const name = String(formData.get("name") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const categoryId = Number(formData.get("category_id"));
  const acquiredYear = String(formData.get("acquired_year") ?? "").trim();
  const acquiredDate = acquiredYear ? `${acquiredYear}-01-01` : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !categoryId || value < 0) throw new Error("Data aset tidak lengkap.");

  const { error } = await supabase.from("assets").insert({
    household_id: profile.household_id,
    owner_id: user.id,
    category_id: categoryId,
    name,
    value,
    acquired_date: acquiredDate,
    notes,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/assets");
}

export async function updateAsset(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum masuk.");

  const name = String(formData.get("name") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const categoryId = Number(formData.get("category_id"));
  const acquiredYear = String(formData.get("acquired_year") ?? "").trim();
  const acquiredDate = acquiredYear ? `${acquiredYear}-01-01` : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !categoryId || value < 0) throw new Error("Data aset tidak lengkap.");

  const { data, error } = await supabase
    .from("assets")
    .update({
      name,
      value,
      category_id: categoryId,
      acquired_date: acquiredDate,
      notes,
    })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Kamu tidak punya izin mengubah aset ini.");

  revalidatePath("/assets");
}

export async function deleteAsset(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("assets").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Kamu tidak punya izin menghapus aset ini.");
  revalidatePath("/assets");
}
