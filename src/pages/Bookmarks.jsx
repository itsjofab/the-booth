import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PostCard from "../components/PostCard";
import CommentCard from "../components/CommentCard";
import PostSkeleton from "../components/PostSkeleton";
import { fetchPosts } from "../lib/feedService";
import { attachPostProfiles } from "../utils/attachPostProfiles";

export default function Bookmarks() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const attachCommentProfiles = async (comments) => {
    if (!comments?.length) return [];

    const userIds = [
      ...new Set(comments.map((c) => c.user_id).filter(Boolean)),
    ];

    if (userIds.length === 0) return comments;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = {};

    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    return comments.map((comment) => ({
      ...comment,
      profile: profileMap[comment.user_id] || null,
    }));
  };

  const loadBookmarks = useCallback(async () => {
    setLoading((prev) => {
      if (items.length === 0) return true;
      return prev;
    });

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      const postData = await fetchPosts({
        type: "bookmarks",
        userId: user.id,
      });

      const postsWithProfiles = await attachPostProfiles(postData || []);

      const postItems = postsWithProfiles.map((post) => ({
        type: "post",
        id: `post-${post.id}`,
        created_at: post.created_at,
        item: post,
      }));

const { data: commentBookmarkRows, error: commentError } =
  await supabase
    .from("comment_bookmarks")
    .select("id, created_at, comment_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

if (commentError) {
  console.error("COMMENT BOOKMARK LOAD ERROR:", commentError);
}

const commentIds =
  commentBookmarkRows
    ?.map((row) => row.comment_id)
    .filter(Boolean) || [];


let commentsWithProfiles = [];

if (commentIds.length > 0) {
  const { data: commentsData, error: commentsError } =
    await supabase
      .from("comments")
      .select(`
        id,
        post_id,
        parent_comment_id,
        user_id,
        content,
        image_url,
        media_url,
        media_type,
        gif_url,
        likes_count,
        created_at
      `)
      .in("id", commentIds);


  if (commentsError) {
    console.error(
      "BOOKMARKED COMMENTS LOAD ERROR:",
      commentsError
    );
  } else {
    commentsWithProfiles =
      await attachCommentProfiles(
        commentsData || []
      );
  }
}

const commentMap = {};

commentsWithProfiles.forEach((comment) => {
  commentMap[comment.id] = comment;
});

const commentItems =
  commentBookmarkRows
    ?.map((row) => {
      const comment = commentMap[row.comment_id];

      if (!comment) return null;

      return {
        type: "comment",
        id: `comment-${comment.id}`,
        created_at: row.created_at,
        item: comment,
      };
    })
    .filter(Boolean) || [];

      const combined = [...postItems, ...commentItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setItems(combined);
    } catch (err) {
      console.error("BOOKMARK LOAD ERROR:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items.length]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      await Promise.resolve();

      if (!isActive) return;

      await loadBookmarks();
    };

    run();

    return () => {
      isActive = false;
    };
  }, [loadBookmarks]);

  const refreshBookmarks = async () => {
    setRefreshing(true);
    await loadBookmarks();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button
          onClick={refreshBookmarks}
          disabled={loading || refreshing}
          style={{
            ...styles.refreshBtn,
            opacity: loading || refreshing ? 0.5 : 1,
          }}
          title="Refresh bookmarks"
        >
          🔄
        </button>

        <h2 style={styles.title}>🔖 Bookmarks</h2>

        <div style={styles.subtitle}>
          Posts and replies you’ve saved for later
        </div>
      </div>

      {(loading || refreshing) && (
        <div style={styles.feedGap}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {!loading && !refreshing && items.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔖</div>

          <div style={styles.emptyTitle}>Nothing saved yet</div>

          <div style={styles.emptyText}>
            When you bookmark posts or replies, they’ll appear here.
          </div>
        </div>
      )}

      {!loading && !refreshing && items.length > 0 && (
        <>
          <div style={styles.feed}>
            {items.map((entry) => {
              if (entry.type === "post") {
                return <PostCard
                          key={entry.id}
                          post={entry.item}
                          onUnbookmarked={(postId) =>
                            setItems((prev) =>
                              prev.filter(
                                (item) =>
                                  !(
                                    item.type === "post" &&
                                    item.item.id === postId
                                  )
                              )
                            )
                          }
                        />;
              }

              return (
                <CommentCard
                  key={entry.id}
                  comment={entry.item}
                  profileStyle
                  bookmarkPageStyle
                  onReply={(comment) => navigate(`/comment/${comment.id}`)}
                  onUnbookmarked={(commentId) =>
                    setItems((prev) =>
                      prev.filter(
                        (item) =>
                          !(
                            item.type === "comment" &&
                            item.item.id === commentId
                          )
                      )
                    )
                  }
                  onDelete={(commentId) =>
                    setItems((prev) =>
                      prev.filter(
                        (item) =>
                          item.type !== "comment" ||
                          item.item.id !== commentId
                      )
                    )
                  }
                />
              );
            })}
          </div>

          <div style={styles.endState}>
            <div style={styles.endTitle}>You’re all caught up</div>

            <div style={styles.endText}>
              Those are all your saved posts and replies.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "80vh",
  },

  header: {
    position: "relative",
    marginBottom: "18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "4px",
  },

  title: {
    margin: 0,
    fontSize: "20px",
  },

  subtitle: {
    fontSize: "13px",
    opacity: 0.6,
  },

  refreshBtn: {
    position: "absolute",
    top: "0px",
    right: "0px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
    padding: "0",
  },

  feed: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  feedGap: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  emptyState: {
    textAlign: "center",
    padding: "46px 20px",
    marginTop: "20px",
    border: "1px dashed #ddd",
    borderRadius: "14px",
    background: "#fafafa",
  },

  emptyIcon: {
    fontSize: "30px",
    marginBottom: "10px",
  },

  emptyTitle: {
    fontSize: "17px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  emptyText: {
    fontSize: "14px",
    opacity: 0.6,
  },

  endState: {
    textAlign: "center",
    padding: "26px",
    marginTop: "22px",
    border: "1px solid #eee",
    borderRadius: "14px",
    background: "#fafafa",
  },

  endTitle: {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  endText: {
    fontSize: "14px",
    opacity: 0.6,
  },
};