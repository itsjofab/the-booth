import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import useComments from "../hooks/useComments";
import CommentCard from "../components/CommentCard";
import ReplyModal from "../components/ReplyModal";
import PostSkeleton from "../components/PostSkeleton";
import CreatePost from "../components/CreatePost";
import { attachPostProfiles } from "../utils/attachPostProfiles";
import QuotePostModal from "../components/QuotePostModal";
import { getCachedCount, setCachedCount } from "../utils/countCache";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { comments, commentsLoading, fetchComments, deleteComment } =
    useComments();

  const [post, setPost] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const [userId, setUserId] = useState(null);
  const [likes, setLikes] = useState(() =>
  getCachedCount(`post-likes-${id}`, 0)
);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const username =
  post?.profile?.username?.trim() || "user";
  const displayName =
    post?.profile?.full_name?.trim() ||
    username;

  const avatarUrl =
    post?.profile?.avatar_url ||
    "/default-avatar.png";

  const isOwner = userId && post?.user_id === userId;

  const fetchPost = useCallback(async () => {
    if (!id) return null;

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
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("FETCH POST ERROR:", error);
      setNotFound(true);
      setPost(null);
      return null;
    }

    setNotFound(false);

    const [postWithProfile] = await attachPostProfiles([data]);
    setPost(postWithProfile);

    return postWithProfile;
  }, [id]);

const refreshLikeStatus = useCallback(async () => {
  if (!id) return;

  const { data: likeRows, error } = await supabase
    .from("likes")
    .select("id, user_id")
    .eq("post_id", id);

  if (error) {
    console.error("POST LIKE COUNT ERROR:", error);
    return;
  }

  const nextLikes = likeRows?.length || 0;
  setLikes(nextLikes);
  setCachedCount(`post-likes-${id}`, nextLikes);

  if (!userId) {
    setLiked(false);
    return;
  }

  setLiked((likeRows || []).some((like) => like.user_id === userId));
}, [id, userId]);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const load = async () => {
      setPageLoading(true);

      await Promise.all([fetchPost(), fetchComments(id)]);

      if (isMounted) setPageLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id, fetchPost, fetchComments]);

  useEffect(() => {
    if (!id || !userId) return;

    const checkActions = async () => {
      await refreshLikeStatus();

      const { data: bookmarkData } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", userId)
        .maybeSingle();

      setBookmarked(!!bookmarkData);
    };

    checkActions();
  }, [id, userId, refreshLikeStatus]);

  const toggleLike = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const next = !liked;
    setLiked(next);
    setLikes((prev) => {
      const updated = Math.max(0, next ? prev + 1 : prev - 1);

      setCachedCount(`post-likes-${id}`, updated);

      return updated;
    });

    try {
      if (next) {
        const { error } = await supabase.from("likes").insert({
          post_id: id,
          user_id: userId,
        });

        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", userId);

        if (error) throw error;
      }

      await refreshLikeStatus();
    } catch (err) {
      console.error("LIKE ERROR:", err);
      await refreshLikeStatus();
      alert(err.message || "Could not update like.");
    }
  };

  const toggleBookmark = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const next = !bookmarked;
    setBookmarked(next);

    try {
      if (next) {
        const { error } = await supabase.from("bookmarks").insert({
          post_id: id,
          user_id: userId,
        });

        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("post_id", id)
          .eq("user_id", userId);

        if (error) throw error;
      }
    } catch (err) {
      console.error("BOOKMARK ERROR:", err);
      setBookmarked(!next);
      alert(err.message || "Could not update bookmark.");
    }
  };

  const openEditPost = () => {
    if (!isOwner || !post) return;

    setMenuOpen(false);
    setEditingPost(post);
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/post/${id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Post",
          text: post?.content || "Check out this post",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Post link copied!");
      }
    } catch {
      // user cancelled share
    }
  };

  const reportPost = async () => {
    const { error } = await supabase
      .from("posts")
      .update({ is_reported: true })
      .eq("id", id);

    if (error) {
      alert(error.message || "Could not flag post.");
      return;
    }

    setMenuOpen(false);
    alert("Post flagged.");
  };

  const deletePost = async () => {
    const confirmDelete = window.confirm("Delete this post?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message || "Could not delete post.");
      return;
    }

    navigate(-1);
  };

  const formatLongDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleString([], {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);

  const repliesFor = (commentId) =>
    comments.filter((c) => c.parent_comment_id === commentId);

  const showSkeletons = pageLoading || commentsLoading;

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button
          onClick={() => navigate(-1)}
          style={styles.backBtn}
          aria-label="Go back"
        >
          ←
        </button>

        <div style={styles.pageTitle}>Post</div>

        <div style={styles.topSpacer} />
      </div>

      {notFound ? (
        <div style={styles.empty}>
          <strong>Post not found</strong>

          <p style={styles.muted}>
            This post may have been deleted.
          </p>
        </div>
      ) : pageLoading || !post ? (
        <div style={styles.skeletonWrap}>
          <PostSkeleton />
        </div>
      ) : (
        <>
          <article style={styles.detailPost}>
            <div style={styles.postHeader}>
              <div style={styles.authorRow}>
                <img src={avatarUrl} alt="avatar" style={styles.avatar} />

                <div>
                  <div style={styles.displayName}>{displayName}</div>

                  <div style={styles.handle}>@{username}</div>
                </div>
              </div>

              <div style={styles.menuWrap}>
                <button
                  type="button"
                  style={styles.menuBtn}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  ⋯
                </button>

                {menuOpen && (
                  <div style={styles.menu}>
                    {!isOwner && (
                      <button style={styles.menuItem} onClick={reportPost}>
                        🚩
                      </button>
                    )}

                    {isOwner && (
                      <>
                        <button style={styles.menuItem} onClick={openEditPost}>
                          ✏️
                        </button>

                        <button
                          style={styles.menuItemDanger}
                          onClick={deletePost}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {post.content && (
              <div style={styles.postContent}>{post.content}</div>
            )}

            {(post.media_url || post.image_url) && (
              post.media_type?.startsWith("video") ? (
                <video
                  src={post.media_url}
                  controls
                  playsInline
                  preload="metadata"
                  style={styles.media}
                />
              ) : (
                <img
                  src={post.media_url || post.image_url}
                  alt="post"
                  style={styles.media}
                />
              )
            )}

            {post.gif_url && (
              <img src={post.gif_url} alt="gif" style={styles.media} />
            )}

            <div style={styles.timeRow}>
              {formatLongDate(post.created_at)}
            </div>

            <div style={styles.bigActions}>
              <button
                type="button"
                style={styles.bigActionBtn}
                onClick={() =>
                  setReplyingTo({ id: null, profile: post.profile })
                }
              >
                💬
              </button>

              <button
                type="button"
                style={styles.bigActionBtn}
                onClick={() => setQuoteOpen(true)}
              >
                🔁
              </button>

            <button
              type="button"
              onClick={toggleLike}
              style={{
                ...styles.bigActionBtn,
                color: liked ? "red" : "#536471",
              }}
            >
              <span>❤️</span>

              <span style={styles.likeCount}>
                {likes}
              </span>
            </button>

              <button
                type="button"
                onClick={toggleBookmark}
                style={{
                  ...styles.bigActionBtn,
                  color: bookmarked ? "#111" : "#536471",
                  transform: bookmarked ? "scale(1.08)" : "scale(1)",
                  fontWeight: bookmarked ? "700" : "500",
                  background: bookmarked ? "#f1f1f1" : "transparent",
                }}
              >
                🔖
              </button>

              <button
                type="button"
                onClick={sharePost}
                style={styles.bigActionBtn}
              >
                📤
              </button>
            </div>
          </article>

          <section style={styles.replyBox}>
            {showSkeletons ? (
              <div style={styles.replyList}>
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : comments.length === 0 ? (
              <div style={styles.empty}>
                <strong>No replies yet</strong>
                <p style={styles.muted}>
                  Click the reply button on the post to be first.
                </p>
              </div>
            ) : (
              <div style={styles.replyList}>
                {topLevelComments.map((comment) => (
                  <div key={comment.id}>
                    <CommentCard
                      comment={comment}
                      hasReplies={repliesFor(comment.id).length > 0}
                      onReply={setReplyingTo}
                      onDelete={deleteComment}
                    />

                    {repliesFor(comment.id).map((reply) => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        depth={1}
                        onReply={setReplyingTo}
                        onDelete={deleteComment}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {replyingTo && (
        <ReplyModal
          postId={id}
          parentCommentId={replyingTo.id}
          replyingTo={`@${
            replyingTo.profile?.username ||
            post?.profile?.username ||
            "user"
          }`}
          onClose={() => setReplyingTo(null)}
          onCreated={() => fetchComments(id)}
        />
      )}

      {quoteOpen && (
        <QuotePostModal
          quotedPost={post}
          onClose={() => setQuoteOpen(false)}
          onCreated={() => {
            fetchPost();
            fetchComments(id);
          }}
        />
      )}

      {editingPost && (
        <div
          style={styles.editOverlay}
          onClick={() => setEditingPost(null)}
        >
          <div
            style={styles.editModal}
            onClick={(e) => e.stopPropagation()}
          >
            <CreatePost
              editingPost={editingPost}
              onCancelEdit={() => setEditingPost(null)}
              onUpdated={(updatedPost) => {
                setPost((prev) => ({
                  ...prev,
                  ...updatedPost,
                }));
                setEditingPost(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
    padding: 0,
    background: "#fff",
    minHeight: "100vh",
    boxShadow: "0 0 0 9999px #fff",
  },

  topBar: {
    height: "52px",
    display: "grid",
    gridTemplateColumns: "52px 1fr 52px",
    alignItems: "center",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  backBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "24px",
    fontWeight: "400",
    color: "#0f1419",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  pageTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0f1419",
    textAlign: "left",
  },

  topSpacer: {
    width: "52px",
  },

  skeletonWrap: {
    padding: "12px",
  },

  detailPost: {
    padding: "14px 20px 0",
    background: "#fff",
    borderBottom: "1px solid #eff3f4",
  },

  postHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
  },

  authorRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  avatar: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
    flexShrink: 0,
  },

  displayName: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#111",
    lineHeight: 1.2,
  },

  handle: {
    fontSize: "13px",
    color: "#536471",
    lineHeight: 1.2,
  },

  menuWrap: {
    position: "relative",
  },

  menuBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#536471",
    fontSize: "22px",
    lineHeight: 1,
  },

  menu: {
    position: "absolute",
    right: 0,
    top: "28px",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 30,
    width: "44px",
    overflow: "hidden",
  },

  menuItem: {
    width: "44px",
    height: "34px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },

  menuItemDanger: {
    width: "44px",
    height: "34px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    color: "#b00020",
  },

  postContent: {
    fontSize: "16px",
    lineHeight: 1.45,
    color: "#0f1419",
    whiteSpace: "pre-wrap",
    marginBottom: "12px",
    textAlign: "left",
  },

  media: {
    width: "100%",
    maxHeight: "420px",
    objectFit: "cover",
    borderRadius: "16px",
    marginBottom: "12px",
    display: "block",
  },

  timeRow: {
    fontSize: "13px",
    color: "#536471",
    padding: "6px 0 8px",
    textAlign: "left",
  },

  bigActions: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    padding: "6px 0 10px",
  },

  bigActionBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "15px",
    color: "#536471",
    padding: "6px 10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    minWidth: "42px",
  },

  actionCount: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "500",
    color: "inherit",
    minWidth: "8px",
  },

  likeCount: {
    fontSize: "12px",
    marginLeft: "4px",
    fontWeight: "500",
    position: "relative",
    top: "1.5px",
  },

  replyBox: {
    background: "#fff",
  },

  replyList: {
    display: "flex",
    flexDirection: "column",
  },

  empty: {
    textAlign: "center",
    padding: "34px 16px",
    background: "#fff",
  },

  muted: {
    fontSize: "13px",
    opacity: 0.6,
  },

  editOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "70px 14px 20px",
    boxSizing: "border-box",
    overflowY: "auto",
  },

  editModal: {
    width: "100%",
    maxWidth: "560px",
  },
};