import { supabase } from "./supabaseClient";

/**
 * Unified feed system (single source of truth)
 * Includes community data for each post
 */

// 🧠 CENTRAL FILTER (single source of truth)
const BASE_POST_FILTERS = (query) =>
  query.eq("is_hidden", false);

/**
 * FETCH POSTS (HOME / COMMUNITY / BOOKMARKS)
 */
export async function fetchPosts({
  type = "home",
  userId = null,
  communityIds = [],
  communityId = null,

  // ✅ PAGINATION
  from = 0,
  to = 9,
}) {
  try {
    // 🧠 BASE QUERY (shared structure)
    let query = supabase
      .from("posts")
      .select(`
        *,
        communities (
          id,
          name
        ),
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })

      // ✅ ONLY LOAD POSTS NEEDED
      .range(from, to);

    // 🔥 APPLY GLOBAL FILTERS
    query = BASE_POST_FILTERS(query);

    // 🏠 HOME FEED
    if (type === "home") {
      if (!communityIds || communityIds.length === 0) {
        return [];
      }

      const { data, error } = await query.in(
        "community_id",
        communityIds
      );

      if (error) throw error;

      return data || [];
    }

    // 🏘️ COMMUNITY FEED
    if (type === "community") {
      const { data, error } = await query.eq(
        "community_id",
        communityId
      );

      if (error) throw error;

      return data || [];
    }

    // 🔖 BOOKMARKS FEED
    if (type === "bookmarks") {
      const { data, error } = await supabase
        .from("bookmarks")
        .select(`
          posts (
            *,
            communities (
              id,
              name
            ),
            profiles (
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      return (
        data
          ?.map((b) => b.posts)
          .filter(Boolean) || []
      );
    }

    return [];
  } catch (err) {
    console.error("fetchPosts error:", err);
    return [];
  }
}