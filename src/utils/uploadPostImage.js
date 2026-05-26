import { supabase } from "../lib/supabaseClient";

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export async function uploadPostImage(file, userId) {
  if (!file) return null;

  if (!userId) {
    throw new Error("You must be logged in to upload images.");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PNG, JPG, WEBP, and GIF images are allowed.");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("Image must be under 5MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const filePath = `posts/${userId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(filePath, file);

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from("post-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}