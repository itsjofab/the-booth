import { useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch posts for a community
  const fetchPosts = useCallback(async (communityId) => {
    if (!communityId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        community_id,
        user_id,
        content,
        image_url,
        media_url,
        media_type,
        gif_url,
        likes_count,
        is_hidden,
        is_reported,
        created_at
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchPosts error:", error);
      setLoading(false);
      return;
    }

    setPosts(data || []);
    setLoading(false);
  }, []);

  // Create post
  const createPost = useCallback(async (communityId, content) => {
    if (!communityId || !content) return false;

    const { error } = await supabase.from("posts").insert([
      {
        community_id: communityId,
        content,
      },
    ]);

    if (error) {
      console.error("createPost error:", error);
      return false;
    }

    // refresh after create
    await fetchPosts(communityId);
    return true;
  }, [fetchPosts]);

  return {
    posts,
    loading,
    fetchPosts,
    createPost,
  };
}