import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { isDemoUser } from "../utils/demoUser";
import {
  getDemoSandbox,
  updateDemoSandbox,
} from "../utils/demoSandbox";

export default function useComments() {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const attachProfiles = useCallback(async (commentRows) => {
    if (!commentRows?.length) return [];

    const userIds = [
      ...new Set(
        commentRows
          .map((c) => c.user_id)
          .filter((id) => typeof id === "string" && id.length === 36)
      ),
    ];

    if (userIds.length === 0) {
      return commentRows.map((comment) => ({
        ...comment,
        profile: comment.profile || null,
      }));
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    if (error) {
      console.error("COMMENT PROFILE FETCH ERROR:", error);
      return commentRows.map((comment) => ({
        ...comment,
        profile: null,
      }));
    }

    const profileMap = {};
    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    return commentRows.map((comment) => ({
      ...comment,
      profile: comment.profile || profileMap[comment.user_id] || null,
    }));
  }, []);

  const fetchComments = useCallback(
    async (postId) => {
      if (!postId) {
        setComments([]);
        setCommentsLoading(false);
        return;
      }

      setCommentsLoading((prev) => {
        if (comments.length === 0) return true;
        return prev;
      });

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (isDemoUser(user)) {
        const sandbox = getDemoSandbox();
        const demoComments = sandbox.comments?.[postId] || [];

        setComments(demoComments);
        setCommentsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("comments")
        .select(
          "id, post_id, user_id, content, parent_comment_id, image_url, media_url, media_type, gif_url, is_deleted, created_at"
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("FETCH COMMENTS ERROR:", error);
        setComments([]);
        setCommentsLoading(false);
        return;
      }

      const commentsWithProfiles = await attachProfiles(data || []);
      setComments(commentsWithProfiles);
      setCommentsLoading(false);
    },
    [attachProfiles, comments.length]
  );

  const createComment = useCallback(
    async (postId, content, parentCommentId = null) => {
      if (!postId || !content.trim()) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) return;

      if (isDemoUser(user)) {
        const demoComment = {
          id: `demo-comment-${Date.now()}`,
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId,
          image_url: null,
          media_url: null,
          media_type: null,
          gif_url: null,
          is_deleted: false,
          created_at: new Date().toISOString(),
          profile: {
            username: "demo",
            full_name: "Demo User",
            avatar_url: "/default-avatar.png",
          },
        };

        updateDemoSandbox((current) => {
          const existing = current.comments?.[postId] || [];

          return {
            ...current,
            comments: {
              ...(current.comments || {}),
              [postId]: [...existing, demoComment],
            },
          };
        });

        setComments((prev) => [...prev, demoComment]);
        return;
      }

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId,
        })
        .select(
          "id, post_id, user_id, content, parent_comment_id, image_url, media_url, media_type, gif_url, is_deleted, created_at"
        )
        .single();

      if (error) {
        console.error("CREATE COMMENT ERROR:", error);
        return;
      }

      const [commentWithProfile] = await attachProfiles([data]);

      setComments((prev) => [...prev, commentWithProfile]);
    },
    [attachProfiles]
  );

  const deleteComment = useCallback(async (commentId) => {
    if (!commentId) return;

    if (String(commentId).startsWith("demo-comment-")) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                is_deleted: true,
                content: "[deleted]",
                image_url: null,
                media_url: null,
                media_type: null,
                gif_url: null,
              }
            : c
        )
      );

      return;
    }

    const { error } = await supabase
      .from("comments")
      .update({
        is_deleted: true,
        content: "[deleted]",
        image_url: null,
        media_url: null,
        media_type: null,
        gif_url: null,
      })
      .eq("id", commentId);

    if (error) {
      console.error("DELETE COMMENT ERROR:", error);
      return;
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              is_deleted: true,
              content: "[deleted]",
              image_url: null,
              media_url: null,
              media_type: null,
              gif_url: null,
            }
          : c
      )
    );
  }, []);

  return {
    comments,
    commentsLoading,
    fetchComments,
    createComment,
    deleteComment,
  };
}