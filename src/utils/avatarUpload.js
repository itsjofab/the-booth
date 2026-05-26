import { supabase } from "../lib/supabaseClient";

/* -----------------------------
   CONFIG
------------------------------ */
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* -----------------------------
   IMAGE COMPRESSION
   (simple browser-based resize + quality compression)
------------------------------ */
async function compressImage(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxWidth / img.width, 1);

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };

    reader.readAsDataURL(file);
  });
}

/* -----------------------------
   MAIN UPLOAD FUNCTION
------------------------------ */
export async function uploadAvatar(file, userId) {
  if (!file || !userId) return null;

  /* 1. Validate type */
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed");
  }

  /* 2. Validate size */
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image must be under 2MB");
  }

  /* 3. Compress image */
  const compressedFile = await compressImage(file);

  /* 4. Create safe file name */
  const fileExt = "jpg";
  const fileName = `${userId}-${Date.now()}.${fileExt}`;

  /* 5. Upload to Supabase */
  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, compressedFile, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  /* 6. Get public URL */
  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return data.publicUrl;
}