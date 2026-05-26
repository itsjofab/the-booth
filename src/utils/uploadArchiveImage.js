import { supabase } from "../lib/supabaseClient";

export async function uploadArchiveImage(file, userId) {
  if (!file || !userId) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `archive-images/${fileName}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("post-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}