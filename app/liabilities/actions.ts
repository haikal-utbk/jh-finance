"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addLiability(formData: FormData) {
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
  const startedYear = String(formData.get("started_year") ?? "").trim();
  const startedDate = startedYear ? `${startedYear}-01-01` : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !categoryId || value < 0) throw new Error("Data kewajiban tidak lengkap.");

  const { error } = await supabase.from("liabilities").insert({
    household_id: profile.household_id,
    owner_id: user.id,
    category_id: categoryId,
    name,
    value,
    started_date: startedDate,
    notes,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/liabilities");
  revalidatePath("/dashboard");
}

export async function updateLiability(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum masuk.");

  const name = String(formData.get("name") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  const categoryId = Number(formData.get("category_id"));
  const startedYear = String(formData.get("started_year") ?? "").trim();
  const startedDate = startedYear ? `${startedYear}-01-01` : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !categoryId || value < 0) throw new Error("Data kewajiban tidak lengkap.");

  const { data, error } = await supabase
    .from("liabilities")
    .update({
      name,
      value,
      category_id: categoryId,
      started_date: startedDate,
      notes,
    })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Kamu tidak punya izin mengubah kewajiban ini.");

  revalidatePath("/liabilities");
  revalidatePath("/dashboard");
}

export async function deleteLiability(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("liabilities").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Kamu tidak punya izin menghapus kewajiban ini.");
  revalidatePath("/liabilities");
  revalidatePath("/dashboard");
}
