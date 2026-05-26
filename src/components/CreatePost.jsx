import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadPostMedia } from "../utils/uploadPostMedia";

export default function CreatePost({
  onCreate,
  editingPost = null,
  onUpdated,
  onCancelEdit,
}) {
  const fileInputRef = useRef(null);

  const isEditing = !!editingPost;

const [content, setContent] = useState(editingPost?.content || "");
const [imageFile, setImageFile] = useState(null);
const [mediaType, setMediaType] = useState(
  editingPost?.media_type || null
);
const [imagePreview, setImagePreview] = useState(
  editingPost?.media_url || editingPost?.image_url || null
);
const [existingImageUrl, setExistingImageUrl] = useState(
  editingPost?.media_url || editingPost?.image_url || null
);

  const [gifUrl, setGifUrl] = useState(editingPost?.gif_url || "");
  const [showGifInput, setShowGifInput] = useState(!!editingPost?.gif_url);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showGifMenu, setShowGifMenu] = useState(false);
  const [profile, setProfile] = useState(null);

  const canPost =
    content.trim() || imageFile || existingImageUrl || gifUrl.trim();

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
    setExistingImageUrl(null);
    setImagePreview(URL.createObjectURL(file));
    setMediaType(file.type || null);
  };

  const resetForm = () => {
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setMediaType(null);
    setGifUrl("");
    setShowGifInput(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canPost) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        throw new Error("You must be logged in to post.");
      }

      let imageUrl = existingImageUrl;

      if (imageFile) {
        imageUrl = await uploadPostMedia(imageFile, user.id);
      }

      if (isEditing) {
        const { error } = await supabase
          .from("posts")
          .update({
            content: content.trim(),
            image_url:
              mediaType?.startsWith("image")
                ? imageUrl || null
                : null,

            media_url: imageUrl || null,
            media_type: mediaType || null,

            gif_url: gifUrl.trim() || null,
          })
          .eq("id", editingPost.id)
          .eq("user_id", user.id);

        if (error) throw error;

        onUpdated?.({
          ...editingPost,
          content: content.trim(),
        image_url:
          mediaType?.startsWith("image")
            ? imageUrl || null
            : null,

        media_url: imageUrl || null,
        media_type: mediaType || null,

        gif_url: gifUrl.trim() || null,
        });

        return;
      }

      await onCreate({
        content: content.trim(),
       image_url:
        mediaType?.startsWith("image")
          ? imageUrl || null
          : null,

      media_url: imageUrl || null,
      media_type: mediaType || null,

      gif_url: gifUrl.trim() || null,
      });

      resetForm();
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      {isEditing && (
        <div style={styles.editHeader}>
          <button
            type="button"
            onClick={onCancelEdit}
            style={styles.backBtn}
          >
            ←
          </button>

          <div style={styles.editTitle}>Edit post</div>
        </div>
      )}

      <div style={styles.composeRow}>
        <img
          src={
            profile?.avatar_url ||
            "/default-avatar.png"
          }
          alt="profile"
          style={styles.avatar}
        />

        <textarea
          placeholder={
            isEditing
              ? "Edit your post"
              : "What's happening in this community?"
          }
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
          placeholder="Paste direct .gif image link"
          value={gifUrl}
          onChange={(e) => setGifUrl(e.target.value)}
          style={styles.gifInput}
        />
      )}

      {gifUrl && (
        <div style={styles.previewWrap}>
          <img
            src={gifUrl}
            alt="GIF preview"
            style={styles.previewImage}
          />

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

      {showGifMenu && (
        <div style={styles.gifModalOverlay}>
          <div style={styles.gifModal}>
            <div style={styles.gifModalHeader}>
              <button
                type="button"
                onClick={() => setShowGifMenu(false)}
                style={styles.gifBackBtn}
              >
                ←
              </button>

              <div style={styles.gifModalTitle}>Add a GIF</div>
            </div>

            <button
              type="button"
              style={styles.gifOptionBtn}
              onClick={() => {
                window.open("https://tenor.com/", "_blank");
              }}
            >
              <div style={styles.gifOptionText}>
                Open a GIF on Tenor, right click the GIF itself, then copy the
                image address ending in .gif
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

          <div style={styles.gifMenuWrap}>
            <button
              type="button"
              onClick={() => setShowGifMenu(true)}
              style={styles.gifButton}
              title="Add GIF"
            >
              GIF
            </button>
          </div>

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
          disabled={loading || !canPost}
          style={{
            ...styles.postButton,
            opacity: loading || !canPost ? 0.55 : 1,
          }}
        >
          {loading
            ? isEditing
              ? "Saving..."
              : "Posting..."
            : isEditing
            ? "Save"
            : "Post"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  card: {
    background: "#fff",
    border: "none",
    borderRadius: "18px",
    padding: "18px 18px 14px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  editHeader: {
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

  editTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111",
  },

  composeRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    minHeight: "140px",
  },

  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#f0f0f0",
    objectFit: "cover",
    display: "block",
    flexShrink: 0,
  },

  textarea: {
    flex: 1,
    border: "none",
    outline: "none",
    resize: "none",
    minHeight: "120px",
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
    padding: "0",
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
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "2px",
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

  gifMenuWrap: {
    position: "relative",
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

  gifModalHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },

  gifBackBtn: {
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

  gifModalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111",
  },

  gifOptionBtn: {
    width: "100%",
    border: "1px solid #eee",
    background: "#fff",
    borderRadius: "14px",
    padding: "12px",
    cursor: "pointer",
    textAlign: "left",
    marginBottom: "10px",
  },

  gifOptionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#111",
    marginBottom: "3px",
  },

  gifOptionText: {
    fontSize: "12px",
    color: "#666",
    lineHeight: 1.35,
  },
};