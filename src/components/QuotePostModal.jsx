import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadPostMedia } from "../utils/uploadPostMedia";
import { isDemoUser } from "../utils/demoUser";
import { updateDemoSandbox } from "../utils/demoSandbox";

export default function QuotePostModal({
  quotedPost,
  quotedComment = null,
  onClose,
  onCreated,
}) {
  const fileInputRef = useRef(null);

  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [gifUrl, setGifUrl] = useState("");
  const [showGifInput, setShowGifInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState(null);

  const canQuote = content.trim() || imageFile || gifUrl.trim();

  const quotedUsername =
    quotedComment?.profile?.username ||
    quotedPost?.profile?.username ||
    "user";

  const quotedContent =
    quotedComment?.content ||
    quotedPost?.content ||
    "";

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);
    };

    loadProfile();
  }, []);

  const handleImageChange = (file) => {
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMediaType(file.type || null);
  };

  const submitQuote = async (e) => {
    e.preventDefault();

    if (!canQuote) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        throw new Error("You must be logged in to quote.");
      }

      if (isDemoUser(user)) {
        const demoQuotePost = {
          id: `demo-post-${Date.now()}`,
          user_id: user.id,
          community_id: quotedPost?.community_id || null,
          content: content.trim(),
          image_url: null,
          media_url: null,
          media_type: null,
          gif_url: gifUrl.trim() || null,
          quoted_post_id: quotedPost?.id || null,
          quoted_comment_id: quotedComment?.id || null,
          quoted_post: quotedPost || null,
          quoted_comment: quotedComment || null,
          created_at: new Date().toISOString(),
          likes_count: 0,
          is_hidden: false,
          is_reported: false,
          profile: {
            username: "demo",
            avatar_url: "/default-avatar.png",
          },
        };

        updateDemoSandbox((current) => ({
          ...current,
          posts: [demoQuotePost, ...(current.posts || [])],
        }));

        setContent("");
        setImageFile(null);
        setImagePreview(null);
        setMediaType(null);
        setGifUrl("");
        setShowGifInput(false);

        onCreated?.();
        onClose?.();
        return;
      }

      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadPostMedia(imageFile, user.id);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        community_id: quotedPost?.community_id || null,
        content: content.trim(),
        image_url:
          mediaType?.startsWith("image")
            ? imageUrl || null
            : null,
        media_url: imageUrl || null,
        media_type: mediaType || null,
        gif_url: gifUrl.trim() || null,
        quoted_post_id: quotedPost?.id || null,
        quoted_comment_id: quotedComment?.id || null,
      });

      if (error) throw error;

      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setMediaType(null);
      setGifUrl("");
      setShowGifInput(false);

      onCreated?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || "Could not create quote post.");
    } finally {
      setLoading(false);
    }
  };

const avatarSrc =
  profile?.avatar_url ||
  "/default-avatar.png";

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form
        onSubmit={submitQuote}
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <button type="button" onClick={onClose} style={styles.backBtn}>
            ←
          </button>

          <div style={styles.title}>Quote</div>
        </div>

        <div style={styles.composeRow}>
          <img
            src={avatarSrc}
            alt="profile"
            style={styles.avatar}
          />

          <textarea
            autoFocus
            placeholder="Add a comment"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={styles.textarea}
          />
        </div>

        {imagePreview && (
          <div style={styles.previewWrap}>
            {mediaType?.startsWith("video") ? (
              <video
                src={imagePreview}
                controls
                playsInline
                preload="metadata"
                style={styles.previewImage}
              />
            ) : (
              <img
                src={imagePreview}
                alt="Upload preview"
                style={styles.previewImage}
              />
            )}

            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                setMediaType(null);
              }}
              style={styles.removeBtn}
            >
              ✕
            </button>
          </div>
        )}

        {showGifInput && (
          <input
            type="text"
            placeholder="Paste direct GIF image link"
            value={gifUrl}
            onChange={(e) => setGifUrl(e.target.value)}
            style={styles.gifInput}
          />
        )}

        {gifUrl && (
          <div style={styles.previewWrap}>
            <img src={gifUrl} alt="GIF preview" style={styles.previewImage} />

            <button
              type="button"
              onClick={() => {
                setGifUrl("");
                setShowGifInput(false);
              }}
              style={styles.removeBtn}
            >
              ✕
            </button>
          </div>
        )}

        <div style={styles.quotedBox}>
          <div style={styles.quotedUser}>@{quotedUsername}</div>
          <div style={styles.quotedContent}>
            {quotedContent || "Quoted post"}
          </div>
        </div>

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}

        <div style={styles.bottomBar}>
          <div style={styles.tools}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={styles.toolButton}
              title="Add image"
            >
              🖼️
            </button>

            <button
              type="button"
              onClick={() => setShowGifInput((prev) => !prev)}
              style={styles.gifButton}
              title="Add GIF"
            >
              GIF
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={(e) => handleImageChange(e.target.files?.[0])}
              style={styles.hiddenFile}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canQuote}
            style={{
              ...styles.postButton,
              opacity: loading || !canQuote ? 0.55 : 1,
            }}
          >
            {loading ? "Quoting..." : "Quote"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "70px 14px 20px",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "560px",
    background: "#fff",
    border: "none",
    borderRadius: "18px",
    padding: "18px 18px 14px",
    boxSizing: "border-box",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },

  backBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "20px",
    color: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111",
  },

  composeRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    minHeight: "120px",
  },

  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#f0f0f0",
    flexShrink: 0,
    objectFit: "cover",
  },

  textarea: {
    flex: 1,
    border: "none",
    outline: "none",
    resize: "none",
    minHeight: "110px",
    fontSize: "20px",
    lineHeight: 1.35,
    color: "#111",
    fontFamily: "inherit",
    padding: "6px 0",
  },

  quotedBox: {
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "12px",
    marginTop: "12px",
    background: "#fff",
  },

  quotedUser: {
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  quotedContent: {
    fontSize: "14px",
    color: "#333",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
  },

  previewWrap: {
    position: "relative",
    marginTop: "10px",
    borderRadius: "14px",
    overflow: "hidden",
    border: "1px solid #eee",
  },

  previewImage: {
    width: "100%",
    maxHeight: "260px",
    objectFit: "cover",
    display: "block",
  },

  removeBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  },

  gifInput: {
    width: "100%",
    padding: "10px 12px",
    marginTop: "8px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
    fontSize: "14px",
  },

  bottomBar: {
    borderTop: "1px solid #eee",
    marginTop: "14px",
    paddingTop: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tools: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  toolButton: {
    width: "24px",
    height: "24px",
    border: "none",
    background: "transparent",
    color: "#1d9bf0",
    cursor: "pointer",
    fontSize: "17px",
    padding: 0,
  },

  gifButton: {
    width: "32px",
    height: "24px",
    border: "none",
    background: "transparent",
    color: "#1d9bf0",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    padding: 0,
  },

  hiddenFile: {
    display: "none",
  },

  postButton: {
    border: "none",
    borderRadius: "999px",
    background: "#1d9bf0",
    color: "#fff",
    padding: "9px 18px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
  },

  error: {
    color: "#b00020",
    fontSize: "13px",
    margin: "8px 0 0",
  },
};