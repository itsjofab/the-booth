import { supabase } from "../lib/supabaseClient";

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error("ensureProfile timed out")
          ),
        ms
      )
    ),
  ]);
}

export async function ensureProfile(user) {
  if (!user?.id) return null;

  try {
    const { data: existing, error: selectError } =
      await withTimeout(
        supabase
          .from("profiles")
          .select(`
            id,
            username,
            full_name,
            bio,
            avatar_url,
            banner_url,
            email,
            profile_completed,
            created_at
          `)
          .eq("id", user.id)
          .maybeSingle()
      );

    if (selectError) {
      console.error(
        "ENSURE PROFILE SELECT ERROR:",
        selectError
      );
      return null;
    }

    if (existing) return existing;

    const starterProfile = {
      id: user.id,
      email: user.email || null,
      username: null,
      bio: "",
      avatar_url: null,
      banner_url: null,
      profile_completed: false,
      created_at: new Date().toISOString(),
    };

    const { data, error: insertError } =
      await withTimeout(
        supabase
          .from("profiles")
.upsert(starterProfile, {
  onConflict: "id",
})
          .select(`
            id,
            username,
            full_name,
            bio,
            avatar_url,
            banner_url,
            email,
            profile_completed,
            created_at
          `)
          .single()
      );

    if (insertError) {
      console.error(
        "ENSURE PROFILE INSERT ERROR:",
        insertError
      );
      return null;
    }

    return data;
  } catch (err) {
    console.error(
      "ENSURE PROFILE FAILED:",
      err
    );
    return null;
  }
}