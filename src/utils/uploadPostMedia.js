import { supabase } from "../lib/supabaseClient";

export async function uploadPostMedia(file, userId) {
  if (!file || !userId) return null;

  const ext = file.name.split(".").pop();

  const isVideo = file.type?.startsWith("video");

  const bucket = isVideo
    ? "post-videos"
    : "post-images";

  const fileName = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error("UPLOAD MEDIA ERROR:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return data.publicUrl;
}