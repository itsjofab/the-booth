import { supabase } from "../lib/supabaseClient";

export async function attachPostProfiles(posts) {
  if (!posts?.length) return [];

  const quotedPostIds = [
    ...new Set(
      posts
        .map((post) => post.quoted_post_id)
        .filter(Boolean)
    ),
  ];

  let quotedPostMap = {};

  if (quotedPostIds.length > 0) {
    const { data: quotedPosts, error: quotedError } = await supabase
      .from("posts")
      .select("*")
      .in("id", quotedPostIds);

    if (!quotedError && quotedPosts?.length) {
      quotedPostMap = quotedPosts.reduce((map, quotedPost) => {
        map[quotedPost.id] = quotedPost;
        return map;
      }, {});
    }
  }

  const userIds = [
    ...new Set(
      [
        ...posts.map((post) => post.user_id),
        ...Object.values(quotedPostMap).map((post) => post.user_id),
      ].filter(Boolean)
    ),
  ];

  if (userIds.length === 0) {
    return posts;
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", userIds);

  if (error) {
    console.error("ATTACH POST PROFILES ERROR:", error);
    return posts;
  }

  const profileMap = {};

  (profiles || []).forEach((profile) => {
    profileMap[profile.id] = profile;
  });

  return posts.map((post) => {
    const quotedPost = post.quoted_post_id
      ? quotedPostMap[post.quoted_post_id] || null
      : null;

    return {
      ...post,
      profile: profileMap[post.user_id] || null,
      quoted_post: quotedPost
        ? {
            ...quotedPost,
            profile: profileMap[quotedPost.user_id] || null,
          }
        : null,
    };
  });
}