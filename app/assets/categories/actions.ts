"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addAssetCategory(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum masuk.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nama kategori tidak boleh kosong.");

  const { error } = await supabase.from("asset_categories").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/assets/categories");
  revalidatePath("/assets");
}

export async function deleteAssetCategory(id: number) {
  const supabase = createClient();
  const { error } = await supabase.from("asset_categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Kategori ini masih dipakai oleh aset, hapus atau ubah aset itu dulu.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/assets/categories");
  revalidatePath("/assets");
}
