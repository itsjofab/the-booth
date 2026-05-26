import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import QuotePostModal from "./QuotePostModal";
import ReplyModal from "./ReplyModal";
import { getCachedCount, setCachedCount } from "../utils/countCache";

export default function CommentCard({
  comment,
  depth = 0,
  hasReplies = false,
  onReply,
  onDelete,
  disableNavigate = false,
  profileStyle = false,
  bookmarkPageStyle = false,
  onUnliked,
  onUnbookmarked,
}) {
  const navigate = useNavigate();

  const [displayComment, setDisplayComment] = useState(comment);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [originalPost, setOriginalPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [likes, setLikes] = useState(() =>
    getCachedCount(`comment-likes-${comment.id}`, comment.likes_count || 0)
  );
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const username = displayComment.profile?.username?.trim() || "user";

  const displayName = displayComment.profile?.full_name?.trim() || username;

  const isOwner = currentUserId === displayComment.user_id;
  const isDeleted = displayComment.is_deleted;

  const avatarUrl = displayComment.profile?.avatar_url || "/default-avatar.png";

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 1600);
  };

  const stop = (e) => e.stopPropagation();

  const openProfile = () => {
    if (displayComment.user_id) {
      navigate(`/profile/${displayComment.user_id}`);
    }
  };

  const openComment = () => {
    if (disableNavigate) return;
    navigate(`/comment/${displayComment.id}`);
  };

  const refreshLikeStatus = async () => {
    if (!displayComment.id) return;

    if (currentUserId) {
      const { data: likeData } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", displayComment.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      setLiked(!!likeData);
    }

    const { count } = await supabase
      .from("comment_likes")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", displayComment.id);

    const nextLikes = count || 0;

    setLikes(nextLikes);
    setCachedCount(`comment-likes-${displayComment.id}`, nextLikes);
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!displayComment.id || !currentUserId) return;

    let mounted = true;

    const checkStatus = async () => {
      const { data: likeData } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", displayComment.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      const { count } = await supabase
        .from("comment_likes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", displayComment.id);

      const { data: bookmarkData } = await supabase
        .from("comment_bookmarks")
        .select("id")
        .eq("comment_id", displayComment.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!mounted) return;

      setLiked(!!likeData);

      const nextLikes = count || 0;
      setLikes(nextLikes);
      setCachedCount(`comment-likes-${displayComment.id}`, nextLikes);

      setBookmarked(!!bookmarkData);
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [displayComment.id, currentUserId]);

  useEffect(() => {
    if (!displayComment?.post_id) return;

    const fetchOriginalPost = async () => {
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
          created_at
        `)
        .eq("id", displayComment.post_id)
        .maybeSingle();

      if (!error) {
        setOriginalPost(data);
      }
    };

    fetchOriginalPost();
  }, [displayComment?.post_id]);

  const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    return date.toLocaleDateString();
  };

  const toggleLike = async () => {
    if (!currentUserId) {
      navigate("/login");
      return;
    }

    const next = !liked;

    setLiked(next);
    setLikes((prev) => {
      const updated = Math.max(0, next ? prev + 1 : prev - 1);
      setCachedCount(`comment-likes-${displayComment.id}`, updated);
      return updated;
    });

    try {
      if (next) {
        const { error } = await supabase.from("comment_likes").insert({
          comment_id: displayComment.id,
          user_id: currentUserId,
        });

        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", displayComment.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        onUnliked?.(displayComment.id);
      }

      await refreshLikeStatus();
    } catch (err) {
      console.error("COMMENT LIKE ERROR:", err);
      await refreshLikeStatus();
      alert(err.message || "Could not update like.");
    }
  };

  const toggleBookmark = async () => {
    if (!currentUserId) {
      navigate("/login");
      return;
    }

    const next = !bookmarked;

    setBookmarked(next);

    try {
      if (next) {
        const { error } = await supabase.from("comment_bookmarks").insert({
          comment_id: displayComment.id,
          user_id: currentUserId,
        });

        if (error && error.code !== "23505") throw error;

        showToast("Added to your bookmarks");
      } else {
        const { error } = await supabase
          .from("comment_bookmarks")
          .delete()
          .eq("comment_id", displayComment.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        onUnbookmarked?.(displayComment.id);
        showToast("Removed from bookmarks");
      }
    } catch (err) {
      console.error("COMMENT BOOKMARK ERROR:", err);
      setBookmarked(!next);
      alert(err.message || "Could not update bookmark.");
    }
  };

  const shareComment = async () => {
    const url = `${window.location.origin}/post/${displayComment.post_id}?comment=${displayComment.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Reply",
          text: displayComment.content || "Check out this reply",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Reply link copied");
      }
    } catch {
      // user cancelled share
    }
  };

  const flagComment = async () => {
    const { error } = await supabase
      .from("comments")
      .update({ is_reported: true })
      .eq("id", displayComment.id);

    if (error) {
      alert(error.message || "Could not flag reply.");
      return;
    }

    setMenuOpen(false);
    showToast("Reply flagged");
  };

  const openEditModal = (e) => {
    stop(e);
    if (!isOwner) return;

    setMenuOpen(false);
    setEditingComment(displayComment);
  };

  const deleteComment = async (e) => {
    stop(e);

    const confirmDelete = window.confirm("Delete this reply?");
    if (!confirmDelete) return;

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
      .eq("id", displayComment.id)
      .eq("user_id", currentUserId);

    if (error) {
      alert(error.message || "Could not delete reply.");
      return;
    }

    setDisplayComment((prev) => ({
      ...prev,
      is_deleted: true,
      content: "[deleted]",
      image_url: null,
      media_url: null,
      media_type: null,
      gif_url: null,
    }));

    onDelete?.(displayComment.id);
    setMenuOpen(false);
  };

  return (
    <div
      onClick={openComment}
      style={{
        ...styles.card,
        ...(profileStyle ? styles.profileCard : {}),
        borderTop: profileStyle
          ? "1px solid #eff3f4"
          : depth > 0
          ? "none"
          : "1px solid #eff3f4",
        cursor: disableNavigate ? "default" : "pointer",
      }}
    >
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.replyLayout}>
        <div style={styles.avatarColumn}>
          <img
            src={avatarUrl}
            alt="avatar"
            style={styles.avatar}
            onClick={(e) => {
              stop(e);
              openProfile();
            }}
          />

          {depth > 0 && <div style={styles.replyLineTop} />}

          {hasReplies && !isDeleted && <div style={styles.replyLine} />}
        </div>

        <div style={styles.replyBody}>
          <div style={styles.header}>
            <div style={styles.userLine}>
              <span
                style={styles.displayName}
                onClick={(e) => {
                  stop(e);
                  openProfile();
                }}
              >
                {displayName}
              </span>

              <span style={styles.handle}>@{username}</span>

              <span style={styles.dot}>•</span>

              <span style={styles.time}>
                {formatTime(displayComment.created_at)}
              </span>
            </div>

            <div style={styles.menuWrap}>
              <button
                type="button"
                style={styles.menuBtn}
                onClick={(e) => {
                  stop(e);
                  setMenuOpen((prev) => !prev);
                }}
                title="More"
              >
                ⋯
              </button>

              {!isDeleted && menuOpen && (
                <div style={styles.menu}>
                  {!isOwner && (
                    <button style={styles.menuItem} onClick={flagComment}>
                      🚩
                    </button>
                  )}

                  {isOwner && (
                    <>
                      <button style={styles.menuItem} onClick={openEditModal}>
                        ✏️
                      </button>

                      <button
                        style={styles.menuItemDanger}
                        onClick={deleteComment}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {depth > 0 && (
            <div style={styles.replyingTo}>Replying to @{username}</div>
          )}

          {isDeleted ? (
            <div style={styles.deletedText}>This comment was deleted.</div>
          ) : (
            displayComment.content && (
              <div style={styles.content}>{displayComment.content}</div>
            )
          )}

          {!isDeleted &&
            (displayComment.media_url || displayComment.image_url) && (
              <div style={styles.mediaWrap}>
                {displayComment.media_type?.startsWith("video") ? (
                  <video
                    src={displayComment.media_url}
                    controls
                    playsInline
                    preload="metadata"
                    style={styles.media}
                  />
                ) : (
                  <img
                    src={displayComment.media_url || displayComment.image_url}
                    alt="Reply media"
                    style={styles.media}
                  />
                )}
              </div>
            )}

          {!isDeleted && displayComment.gif_url && (
            <div style={styles.mediaWrap}>
              <img
                src={displayComment.gif_url}
                alt="GIF"
                style={styles.media}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              {!displayComment.gif_url.match(
                /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i
              ) && (
                <a
                  href={displayComment.gif_url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.gifLink}
                  onClick={stop}
                >
                  Open GIF
                </a>
              )}
            </div>
          )}

          {!isDeleted && (
            <div
              style={
                bookmarkPageStyle ? styles.bookmarkActions : styles.actions
              }
              onClick={stop}
            >
              <button
                type="button"
                onClick={() => onReply(displayComment)}
                style={styles.actionBtn}
                title="Reply"
              >
                💬
              </button>

              <button
                type="button"
                onClick={() => setQuoteOpen(true)}
                style={styles.actionBtn}
                title="Quote"
              >
                🔁
              </button>

              <button
                type="button"
                onClick={toggleLike}
                style={{
                  ...styles.actionBtn,
                  color: liked ? "red" : "#536471",
                }}
                title="Like"
              >
                ❤️ <span style={styles.likeCount}>{likes}</span>
              </button>

              <button
                type="button"
                onClick={toggleBookmark}
                style={{
                  ...styles.actionBtn,
                  color: bookmarked ? "#111" : "#536471",
                  transform: bookmarked ? "scale(1.08)" : "scale(1)",
                  fontWeight: bookmarked ? "700" : "500",
                  background: bookmarked ? "#f1f1f1" : "transparent",
                }}
                title="Bookmark"
              >
                🔖
              </button>

              <button
                type="button"
                style={styles.actionBtn}
                title="Share"
                onClick={shareComment}
              >
                📤
              </button>
            </div>
          )}
        </div>
      </div>

      {editingComment && (
        <ReplyModal
          postId={displayComment.post_id}
          parentCommentId={displayComment.parent_comment_id || null}
          replyingTo={`@${username}`}
          editingComment={editingComment}
          onClose={() => setEditingComment(null)}
          onUpdated={(updatedComment) => {
            setEditingComment(null);

            if (updatedComment) {
              setDisplayComment((prev) => ({
                ...prev,
                ...updatedComment,
              }));
            }

            showToast("Reply updated");
          }}
        />
      )}

      {quoteOpen && (
        <QuotePostModal
          quotedPost={{
            id: originalPost?.id || displayComment.post_id,
            community_id: originalPost?.community_id || null,
            profile: originalPost?.profile || null,
            content: originalPost?.content || "",
            image_url: originalPost?.image_url || null,
            media_url: originalPost?.media_url || null,
            media_type: originalPost?.media_type || null,
            gif_url: originalPost?.gif_url || null,
          }}
          quotedComment={displayComment}
          onClose={() => setQuoteOpen(false)}
          onCreated={() => showToast("Quote posted")}
        />
      )}
    </div>
  );
}

const styles = {
  card: {
    position: "relative",
    padding: "12px 20px 0",
    background: "#fff",
    transition: "all 0.16s ease",
    overflow: "visible",
    textAlign: "left",
  },

  profileCard: {
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "12px 20px 10px",
    marginBottom: "10px",
  },

  replyLayout: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    position: "relative",
    textAlign: "left",
  },

  replyBody: {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
  },

  avatarColumn: {
    width: "42px",
    minHeight: "42px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    position: "relative",
    overflow: "visible",
  },

  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
    cursor: "pointer",
    flexShrink: 0,
    position: "relative",
    zIndex: 2,
  },

  replyLine: {
    position: "absolute",
    top: "42px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "2px",
    height: "140px",
    background: "#d8dfe3",
    zIndex: 0,
  },

  replyLineTop: {
    position: "absolute",
    top: "-32px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "2px",
    height: "34px",
    background: "#d8dfe3",
    zIndex: 0,
  },

  toast: {
    position: "absolute",
    left: "50%",
    bottom: "46px",
    transform: "translateX(-50%)",
    background: "#111",
    color: "#fff",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    zIndex: 30,
    whiteSpace: "nowrap",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    lineHeight: 1.2,
    textAlign: "left",
  },

  displayName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#111",
    cursor: "pointer",
    lineHeight: 1.2,
    textAlign: "left",
  },

  userLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },

  handle: {
    fontSize: "13px",
    color: "#536471",
    lineHeight: 1.2,
  },

  dot: {
    opacity: 0.5,
  },

  time: {
    fontSize: "12px",
    opacity: 0.6,
  },

  replyingTo: {
    fontSize: "13px",
    color: "#536471",
    marginTop: "2px",
    textAlign: "left",
  },

  menuWrap: {
    position: "relative",
    flexShrink: 0,
  },

  menuBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    color: "#536471",
    padding: 0,
  },

  menu: {
    position: "absolute",
    right: 0,
    top: "24px",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 20,
    width: "44px",
    overflow: "hidden",
  },

  menuItem: {
    width: "44px",
    height: "32px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    margin: 0,
    lineHeight: 1,
  },

  menuItemDanger: {
    width: "44px",
    height: "32px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    color: "#b00020",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    margin: 0,
    lineHeight: 1,
  },

  content: {
    fontSize: "15px",
    lineHeight: "1.45",
    whiteSpace: "pre-wrap",
    marginTop: "4px",
    color: "#0f1419",
    textAlign: "left",
  },

  mediaWrap: {
    marginTop: "10px",
    marginBottom: "8px",
  },

  media: {
    width: "100%",
    maxWidth: "100%",
    maxHeight: "360px",
    objectFit: "cover",
    borderRadius: "12px",
    display: "block",
  },

  gifLink: {
    display: "inline-block",
    color: "#1d9bf0",
    fontSize: "13px",
    fontWeight: "600",
    marginTop: "6px",
  },

  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "430px",
    marginTop: "8px",
    textAlign: "left",
  },

  bookmarkActions: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "22px",
    marginTop: "8px",
    marginLeft: "-54px",
    borderTop: "1px solid #f2f2f2",
    paddingTop: "8px",
    width: "calc(100% + 54px)",
  },

  actionBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    color: "#536471",
    transition: "all 0.14s ease",
    padding: "5px 8px",
    borderRadius: "999px",
    width: "44px",
    justifyContent: "center",
    display: "flex",
    alignItems: "center",
  },

  likeCount: {
    fontSize: "12px",
    marginLeft: "4px",
    fontWeight: "500",
    color: "inherit",

    position: "relative",
    top: "2px",
  },

  deletedText: {
    fontSize: "14px",
    color: "#777",
    fontStyle: "italic",
    marginTop: "4px",
  },
};