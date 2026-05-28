import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadPostMedia } from "../utils/uploadPostMedia";
import { isDemoUser } from "../utils/demoUser";
import { updateDemoSandbox } from "../utils/demoSandbox";

export default function ReplyModal({
  postId,
  parentCommentId = null,
  replyingTo = "post",
  editingComment = null,
  onClose,
  onCreated,
  onUpdated,
}) {
  const fileInputRef = useRef(null);

  const isEditing = !!editingComment;

  const [content, setContent] = useState(editingComment?.content || "");
  const [imageFile, setImageFile] = useState(null);

  const [mediaType, setMediaType] = useState(
    editingComment?.media_type || null
  );

  const [imagePreview, setImagePreview] = useState(
    editingComment?.media_url ||
      editingComment?.image_url ||
      null
  );

  const [existingImageUrl, setExistingImageUrl] = useState(
    editingComment?.media_url ||
      editingComment?.image_url ||
      null
  );

  const [gifUrl, setGifUrl] = useState(editingComment?.gif_url || "");
  const [showGifInput, setShowGifInput] = useState(!!editingComment?.gif_url);
  const [gifError, setGifError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showGifMenu, setShowGifMenu] = useState(false);
  const [profile, setProfile] = useState(null);

  const cleanGifUrl = gifUrl.trim();

  const canReply =
    content.trim() || imageFile || existingImageUrl || cleanGifUrl;

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);
    };

    loadProfile();
  }, []);

  const handleImageChange = (file) => {
    if (!file) return;

    setImageFile(file);
    setExistingImageUrl(null);
    setImagePreview(URL.createObjectURL(file));
    setMediaType(file.type || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canReply) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        throw new Error("You must be logged in.");
      }

      let imageUrl = existingImageUrl;

      if (imageFile) {
        imageUrl = await uploadPostMedia(imageFile, user.id);
      }

      if (isEditing) {
        if (isDemoUser(user) || String(editingComment.id).startsWith("demo-comment-")) {
          const updatedDemoComment = {
            ...editingComment,
            content: content.trim(),
            image_url: null,
            media_url: null,
            media_type: null,
            gif_url: cleanGifUrl || null,
          };

          updateDemoSandbox((current) => {
            const existing = current.comments?.[postId] || [];

            return {
              ...current,
              comments: {
                ...(current.comments || {}),
                [postId]: existing.map((comment) =>
                  comment.id === editingComment.id
                    ? updatedDemoComment
                    : comment
                ),
              },
            };
          });

          onUpdated?.();
          onClose?.();
          return;
        }

        const { error } = await supabase
          .from("comments")
          .update({
            content: content.trim(),
            image_url:
              mediaType?.startsWith("image")
                ? imageUrl || null
                : null,

            media_url: imageUrl || null,
            media_type: mediaType || null,

            gif_url: cleanGifUrl || null,
          })
          .eq("id", editingComment.id)
          .eq("user_id", user.id);

        if (error) throw error;

        onUpdated?.();
        onClose?.();
        return;
      }

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
          gif_url: cleanGifUrl || null,
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

        setContent("");
        setImageFile(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        setMediaType(null);
        setGifUrl("");
        setShowGifInput(false);
        setGifError(false);

        onCreated?.();
        onClose?.();
        return;
      }

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId,
      image_url:
        mediaType?.startsWith("image")
          ? imageUrl || null
          : null,

      media_url: imageUrl || null,
      media_type: mediaType || null,

      gif_url: cleanGifUrl || null,
      });

      if (error) throw error;

      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
      setMediaType(null);
      setGifUrl("");
      setShowGifInput(false);
      setGifError(false);

      onCreated?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
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
        onSubmit={handleSubmit}
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <button type="button" onClick={onClose} style={styles.backBtn}>
            ←
          </button>

          <div style={styles.title}>
            {isEditing ? "Edit reply" : "Reply"}
          </div>
        </div>

        {!isEditing && (
          <div style={styles.replyingText}>Replying to {replyingTo}</div>
        )}

        <div style={styles.composeRow}>
          <img
            src={avatarSrc}
            alt="profile"
            style={styles.avatar}
          />

          <textarea
            autoFocus
            placeholder={isEditing ? "Edit your reply" : "Post your reply"}
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
                setExistingImageUrl(null);
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
            onChange={(e) => {
              setGifUrl(e.target.value);
              setGifError(false);
            }}
            style={styles.gifInput}
          />
        )}

        {cleanGifUrl && (
          <div style={styles.previewWrap}>
            {gifError ? (
              <div style={styles.gifErrorBox}>
                Could not load GIF preview. Try a direct image link.
              </div>
            ) : (
              <img
                src={cleanGifUrl}
                alt="GIF preview"
                style={styles.previewImage}
                onError={() => setGifError(true)}
              />
            )}

            <button
              type="button"
              onClick={() => {
                setGifUrl("");
                setShowGifInput(false);
                setGifError(false);
              }}
              style={styles.removeBtn}
            >
              ✕
            </button>
          </div>
        )}

        {showGifMenu && (
          <div style={styles.gifModalOverlay}>
            <div style={styles.gifModal}>
              <div style={styles.header}>
                <button
                  type="button"
                  onClick={() => setShowGifMenu(false)}
                  style={styles.backBtn}
                >
                  ←
                </button>

                <div style={styles.title}>Add a GIF</div>
              </div>

              <button
                type="button"
                style={styles.gifOptionBtn}
                onClick={() => window.open("https://tenor.com/", "_blank")}
              >
                <div style={styles.gifOptionText}>
                  Open a GIF on Tenor, right click the GIF itself, then copy
                  the image address ending in .gif
                </div>
              </button>

              <button
                type="button"
                style={styles.gifOptionBtn}
                onClick={() => {
                  setShowGifInput(true);
                  setShowGifMenu(false);
                }}
              >
                <div style={styles.gifOptionTitle}>Paste GIF link</div>
                <div style={styles.gifOptionText}>
                  Add a direct GIF link from Tenor or another site.
                </div>
              </button>
            </div>
          </div>
        )}

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
              onClick={() => setShowGifMenu(true)}
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
            disabled={loading || !canReply}
            style={{
              ...styles.replyButton,
              opacity: loading || !canReply ? 0.55 : 1,
            }}
          >
            {loading
              ? isEditing
                ? "Saving..."
                : "Replying..."
              : isEditing
              ? "Save"
              : "Reply"}
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
    overflowY: "auto",
  },

  card: {
    width: "100%",
    maxWidth: "560px",
    maxHeight: "calc(100vh - 90px)",
    overflowY: "auto",
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

  replyingText: {
    textAlign: "center",
    fontSize: "14px",
    color: "#666",
    marginBottom: "18px",
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
    display: "block",
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

  gifErrorBox: {
    padding: "18px",
    fontSize: "13px",
    color: "#b00020",
    background: "#fff5f5",
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
    position: "sticky",
    bottom: 0,
    background: "#fff",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "2px",
  },

  hiddenFile: {
    display: "none",
  },

  replyButton: {
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

  gifModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 80,
    padding: "16px",
  },

  gifModal: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  },

  gifOptionBtn: {
    width: "100%",
    border: "1px solid #eee",
    borderRadius: "12px",
    background: "#fff",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    marginBottom: "10px",
  },

  gifOptionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  gifOptionText: {
    fontSize: "13px",
    color: "#555",
    lineHeight: 1.35,
  },
};