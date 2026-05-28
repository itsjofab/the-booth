import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import ReplyModal from "./ReplyModal";
import QuotePostModal from "./QuotePostModal";
import CreatePost from "./CreatePost";
import { getCachedCount, setCachedCount } from "../utils/countCache";
import { isDemoUser } from "../utils/demoUser";
import { getDemoSandbox, updateDemoSandbox } from "../utils/demoSandbox";

export default function PostCard({
  post,
  communityName,
  onReplyCreated,
  compact = false,
  onUnliked,
  onUnbookmarked,
  onDeleted,
  onUpdated,
}) {

  const navigate = useNavigate();

  const [displayPost, setDisplayPost] = useState(post);
  const [likes, setLikes] = useState(() =>
  getCachedCount(`post-likes-${post.id}`, post.likes_count || 0)
);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [userId, setUserId] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(() =>
  getCachedCount(`post-comments-${post.id}`, "")
);
  const [toast, setToast] = useState("");
  const [quotedPost, setQuotedPost] = useState(
  displayPost.quoted_post || null
);

  const username =
  displayPost.profile?.username?.trim() || "user";
  const canDeletePost = userId && userId === displayPost.user_id;

  const avatarUrl =
  displayPost.profile?.avatar_url ||
  "/default-avatar.png";

  const stop = (e) => e.stopPropagation();

  const openPost = () => {
    navigate(`/post/${displayPost.id}`);
  };

  const openProfile = (e) => {
    stop(e);

    if (displayPost.user_id) {
      navigate(`/profile/${displayPost.user_id}`);
    }
  };

  const showToast = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 1600);
  };

  const refreshLikeStatus = async () => {
    if (!displayPost?.id) return;

    if (userId) {
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", displayPost.id)
        .eq("user_id", userId)
        .maybeSingle();

      setLiked(!!likeData);
    }

    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", displayPost.id);

    const nextLikes = count || 0;
    setLikes(nextLikes);
    setCachedCount(`post-likes-${displayPost.id}`, nextLikes);
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diff = Math.floor((now - postDate) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    return postDate.toLocaleDateString();
  };

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (!displayPost?.id) return;

    let mounted = true;

    const fetchCommentsCount = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (isDemoUser(user)) {
        const sandbox = getDemoSandbox();
        const demoComments = sandbox.comments?.[displayPost.id] || [];

        setCommentsCount(demoComments.length);
        setCachedCount(`post-comments-${displayPost.id}`, demoComments.length);
        return;
      }
      
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", displayPost.id);

      if (mounted) {
        const nextCommentsCount = count || 0;
        setCommentsCount(nextCommentsCount);
        setCachedCount(`post-comments-${displayPost.id}`, nextCommentsCount);
      }
    };

    fetchCommentsCount();

    return () => {
      mounted = false;
    };
  }, [displayPost?.id, replyOpen]);

  useEffect(() => {
    let mounted = true;

    const fetchQuotedPost = async () => {
      if (!displayPost?.quoted_post_id) return;

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", displayPost.quoted_post_id)
        .maybeSingle();

      if (error || !data || !mounted) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.user_id)
        .maybeSingle();

      if (!mounted) return;

      setQuotedPost({
        ...data,
        profile: profileData || null,
      });
    };

    fetchQuotedPost();

    return () => {
      mounted = false;
    };
  }, [displayPost?.quoted_post_id]);

  useEffect(() => {
    if (!displayPost?.id) return;

    const checkStatus = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (isDemoUser(user)) {
        const sandbox = getDemoSandbox();

        setLiked((sandbox.likedPostIds || []).includes(displayPost.id));
        setBookmarked((sandbox.bookmarkedPostIds || []).includes(displayPost.id));
        return;
      }

      if (userId) {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", displayPost.id)
          .eq("user_id", userId)
          .maybeSingle();

        setLiked(!!likeData);

        const { data: bookmarkData } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("post_id", displayPost.id)
          .eq("user_id", userId)
          .maybeSingle();

        setBookmarked(!!bookmarkData);
      }

      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", displayPost.id);

      const nextLikes = count || 0;
      setLikes(nextLikes);
      setCachedCount(`post-likes-${displayPost.id}`, nextLikes);
    };

    checkStatus();
  }, [userId, displayPost.id]);

  const toggleLike = async (e) => {
    stop(e);

    if (!userId) {
      navigate("/login");
      return;
    }

    const next = !liked;

    setLiked(next);
    setLikes((prev) => {
      const updated = Math.max(0, next ? prev + 1 : prev - 1);

      setCachedCount(`post-likes-${displayPost.id}`, updated);

      return updated;
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (isDemoUser(user)) {
      updateDemoSandbox((current) => {
        const likedPostIds = current.likedPostIds || [];

        return {
          ...current,
          likedPostIds: next
            ? [...new Set([...likedPostIds, displayPost.id])]
            : likedPostIds.filter((id) => id !== displayPost.id),
        };
      });

      return;
    }

    try {
      if (next) {
        const { error } = await supabase.from("likes").insert({
          post_id: displayPost.id,
          user_id: userId,
        });

        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", displayPost.id)
          .eq("user_id", userId);

        if (error) throw error;
        onUnliked?.(displayPost.id);
      }

      await refreshLikeStatus();
    } catch (err) {
      console.error("LIKE ERROR:", err);
      await refreshLikeStatus();
      alert(err.message || "Could not update like.");
    }
  };

  const toggleBookmark = async (e) => {
    stop(e);

    if (!userId) {
      navigate("/login");
      return;
    }

    const next = !bookmarked;
    setBookmarked(next);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (isDemoUser(user)) {
      updateDemoSandbox((current) => {
        const bookmarkedPostIds = current.bookmarkedPostIds || [];

        return {
          ...current,
          bookmarkedPostIds: next
            ? [...new Set([...bookmarkedPostIds, displayPost.id])]
            : bookmarkedPostIds.filter((id) => id !== displayPost.id),
        };
      });

      showToast(next ? "Added to your bookmarks" : "Removed from bookmarks");
      return;
    }

    try {
      if (next) {
        const { error } = await supabase.from("bookmarks").insert({
          post_id: displayPost.id,
          user_id: userId,
        });

        if (error && error.code !== "23505") throw error;

        showToast("Added to your bookmarks");
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("post_id", displayPost.id)
          .eq("user_id", userId);

        if (error) throw error;
        onUnbookmarked?.(displayPost.id);

        showToast("Removed from bookmarks");
      }
    } catch (err) {
      console.error("BOOKMARK ERROR:", err);
      setBookmarked(!next);
      alert(err.message || "Could not update bookmark.");
    }
  };

  const sharePost = async (e) => {
    stop(e);

    const url = `${window.location.origin}/post/${displayPost.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Post",
          text: displayPost.content || "Check out this post",
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
      .eq("id", displayPost.id);

    if (error) {
      alert(error.message || "Could not flag post.");
      return;
    }

    setMenuOpen(false);
    showToast("Post flagged");
  };

  const openEditPost = () => {
    setMenuOpen(false);
    setEditOpen(true);
  };

  const deletePost = async () => {
    const confirmDelete = window.confirm("Delete this post?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", displayPost.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message || "Could not delete post.");
      return;
    }

    onDeleted?.(displayPost.id);
    setMenuOpen(false);
  };

  return (
    <>
      <div
        style={{
          ...styles.card,
          ...(compact
            ? {
                borderBottom: "1px solid #efefef",
                borderRadius: 0,
                marginBottom: 0,
                border: "none",
                boxShadow: "none",
              }
            : {
                border: "1px solid #eee",
                borderRadius: "12px",
                marginBottom: "12px",
                width: "100%",
                boxSizing: "border-box",
              }),
        }}
        onClick={openPost}
      >
        {toast && <div style={styles.toast}>{toast}</div>}

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img
              src={avatarUrl}
              alt="avatar"
              style={styles.avatar}
              onClick={openProfile}
            />

            <div style={styles.headerText}>
              <div style={styles.userLine}>
                <span style={styles.displayName} onClick={openProfile}>
                  {username}
                </span>

                <span style={styles.handle}>@{username}</span>

                <span style={styles.dot}>•</span>

                <span style={styles.time}>
                  {formatTime(displayPost.created_at)}
                </span>
              </div>

              {communityName && (
                <div
                  style={styles.communityBadge}
                  onClick={(e) => {
                    stop(e);
                    navigate(`/c/${displayPost.community_id}`);
                  }}
                >
                  🏘️ {communityName}
                </div>
              )}
            </div>
          </div>

          <div style={styles.menuWrap} onClick={stop}>
            <button
              style={styles.menuBtn}
              onClick={() => setMenuOpen((prev) => !prev)}
              title="More"
            >
              ⋯
            </button>

            {menuOpen && (
              <div style={styles.menu}>
                {!canDeletePost && (
                  <button style={styles.menuItem} onClick={reportPost}>
                    🚩
                  </button>
                )}

                {canDeletePost && (
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

        <div style={styles.body}>
          {displayPost.content && (
            <div style={styles.content}>{displayPost.content}</div>
          )}

          {(displayPost.media_url || displayPost.image_url) && (
            <div style={styles.mediaWrap}>
              {displayPost.media_type?.startsWith("video") ? (
                <video
                  src={displayPost.media_url}
                  controls
                  playsInline
                  preload="metadata"
                  style={styles.media}
                />
              ) : (
                <img
                  src={
                    displayPost.media_url ||
                    displayPost.image_url
                  }
                  alt="Post media"
                  style={styles.media}
                />
              )}
            </div>
          )}

          {displayPost.gif_url && (
            <div style={styles.mediaWrap}>
              <img
                src={displayPost.gif_url}
                alt="GIF"
                style={styles.media}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              {!displayPost.gif_url.match(
                /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i
              ) && (
                <a
                  href={displayPost.gif_url}
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

          {quotedPost && (
            <div
              style={styles.quotedPostBox}
              onClick={(e) => {
                stop(e);
                navigate(`/post/${quotedPost.id}`);
              }}
            >
              <div style={styles.quotedHeader}>
                <img
                  src={
                    quotedPost.profile?.avatar_url ||
                    "/default-avatar.png"
                  }
                  alt="quoted avatar"
                  style={styles.quotedAvatar}
                />

                <div style={styles.quotedUserLine}>
                  <span style={styles.quotedDisplayName}>
                    {quotedPost.profile?.username || "user"}
                  </span>

                  <span style={styles.quotedHandle}>
                    @{quotedPost.profile?.username || "user"}
                  </span>
                </div>
              </div>

              {quotedPost.content && (
                <div style={styles.quotedContent}>{quotedPost.content}</div>
              )}

              {(quotedPost.media_url || quotedPost.image_url) &&
                (quotedPost.media_type?.startsWith("video") ? (
                  <video
                    src={quotedPost.media_url}
                    controls
                    playsInline
                    preload="metadata"
                    style={styles.quotedMedia}
                  />
                ) : (
                  <img
                    src={
                      quotedPost.media_url ||
                      quotedPost.image_url
                    }
                    alt="quoted media"
                    style={styles.quotedMedia}
                  />
                ))}

              {quotedPost.gif_url && (
                <img
                  src={quotedPost.gif_url}
                  alt="quoted gif"
                  style={styles.quotedMedia}
                />
              )}
            </div>
          )}
        </div>

        <div style={styles.actions} onClick={stop}>
          <button
            onClick={() => setReplyOpen(true)}
            style={styles.replyBtn}
            title="Reply"
          >
            💬
            <span style={styles.likeCount}>{commentsCount ?? ""}</span>
          </button>

          <button
            onClick={(e) => {
              stop(e);
              setQuoteOpen(true);
            }}
            style={styles.actionBtn}
            title="Quote"
          >
            🔁
          </button>

          <button
            onClick={toggleLike}
            style={{
              ...styles.actionBtn,
              color: liked ? "red" : "#555",
              transform: liked ? "scale(1.08)" : "scale(1)",
              fontWeight: liked ? "700" : "500",
            }}
            title="Like"
          >
            ❤️
            <span style={styles.likeCount}>{likes}</span>
          </button>

          <button
            onClick={toggleBookmark}
            style={{
              ...styles.actionBtn,
              color: bookmarked ? "#111" : "#555",
              transform: bookmarked ? "scale(1.08)" : "scale(1)",
              fontWeight: bookmarked ? "700" : "500",
              background: bookmarked ? "#f1f1f1" : "transparent",
            }}
            title="Bookmark"
          >
            🔖
          </button>

          <button onClick={sharePost} style={styles.actionBtn} title="Share">
            📤
          </button>
        </div>
      </div>

      {replyOpen && (
        <ReplyModal
          postId={displayPost.id}
          replyingTo={`@${username}`}
          onClose={() => setReplyOpen(false)}
          onCreated={onReplyCreated}
        />
      )}

      {quoteOpen && (
        <QuotePostModal
          quotedPost={displayPost}
          onClose={() => setQuoteOpen(false)}
          onCreated={onReplyCreated}
        />
      )}

      {editOpen && (
        <div style={styles.editOverlay} onClick={() => setEditOpen(false)}>
          <div style={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <CreatePost
              editingPost={displayPost}
              onCancelEdit={() => setEditOpen(false)}
              onUpdated={(updatedPost) => {
                const nextPost = {
                  ...displayPost,
                  ...updatedPost,
                };

                setDisplayPost(nextPost);
                onUpdated?.(nextPost);
                setEditOpen(false);
                showToast("Post updated");
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  card: {
    padding: "16px",
    background: "#fff",
    transition: "all 0.16s ease",
    cursor: "pointer",
    position: "relative",
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
    marginBottom: "-2px",
    fontSize: "13px",
  },

  headerLeft: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    minWidth: 0,
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
    flexShrink: 0,
    cursor: "pointer",
  },

  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    minWidth: 0,
  },

  body: {
    marginLeft: "48px",
    marginTop: "-2px",
  },

  userLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },

  displayName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#111",
    cursor: "pointer",
    lineHeight: 1.2,
  },

  handle: {
    fontSize: "13px",
    color: "#536471",
    lineHeight: 1.2,
  },

  communityBadge: {
    width: "fit-content",
    padding: "3px 8px",
    borderRadius: "999px",
    background: "#f3f3f3",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
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
    color: "#666",
  },

  menu: {
    position: "absolute",
    right: 0,
    top: "28px",
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

  dot: {
    opacity: 0.5,
  },

  time: {
    fontSize: "12px",
    opacity: 0.6,
  },

  content: {
    fontSize: "15px",
    marginTop: "0px",
    marginBottom: "10px",
    lineHeight: "1.45",
    whiteSpace: "pre-wrap",
    textAlign: "left",
  },

  mediaWrap: {
    marginTop: "10px",
    marginBottom: "10px",
  },

  media: {
    width: "100%",
    maxWidth: "100%",
    maxHeight: "420px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #eee",
    display: "block",
  },

  gifLink: {
    display: "inline-block",
    color: "#1d9bf0",
    fontSize: "13px",
    fontWeight: "600",
    marginTop: "6px",
  },

  quotedPostBox: {
    border: "1px solid #ddd",
    borderRadius: "16px",
    padding: "12px",
    marginTop: "10px",
    marginBottom: "10px",
    background: "#fff",
    cursor: "pointer",
  },

  quotedHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },

  quotedAvatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
  },

  quotedName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#111",
  },

  quotedUserLine: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    flexWrap: "wrap",
  },

  quotedDisplayName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#111",
  },

  quotedHandle: {
    fontSize: "13px",
    color: "#536471",
  },

  quotedContent: {
    fontSize: "14px",
    lineHeight: "1.4",
    color: "#111",
    whiteSpace: "pre-wrap",
  },

  quotedMedia: {
    width: "100%",
    maxHeight: "260px",
    objectFit: "cover",
    borderRadius: "12px",
    marginTop: "8px",
    display: "block",
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "22px",
    alignItems: "center",
    marginTop: "8px",
    borderTop: "1px solid #f2f2f2",
    paddingTop: "8px",
  },

  actionBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    color: "#555",
    transition: "all 0.14s ease",
    padding: "5px 8px",
    borderRadius: "999px",

    width: "44px",
    justifyContent: "center",
    display: "flex",
    alignItems: "center",
  },

  replyBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    color: "#555",
    transition: "all 0.14s ease",
    padding: "5px 8px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },

  replyText: {
    fontSize: "13px",
    fontWeight: "500",
  },

  likeCount: {
    fontSize: "12px",
    marginLeft: "4px",
    fontWeight: "500",

    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,

    position: "relative",
    top: "2px",
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