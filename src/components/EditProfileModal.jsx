import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadAvatar } from "../utils/avatarUpload";
import {
  getAvatarUrl,
  getProfileBanner,
} from "../utils/uiDefaults";

export default function EditProfileModal({
  profile,
  setProfile,
  onClose,
}) {
  const [username, setUsername] = useState(
    profile?.username || ""
  );

  const [bio, setBio] = useState(
    profile?.bio || ""
  );

  const [avatarFile, setAvatarFile] =
    useState(null);

  const [bannerFile, setBannerFile] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  /* ---------------- VALIDATION ---------------- */
  const validateFile = (file) => {
    if (!file) return false;

    const allowed = [
      "image/jpeg",
      "image/png",
    ];

    if (!allowed.includes(file.type)) {
      alert("Only JPG and PNG images allowed");
      return false;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image must be under 2MB");
      return false;
    }

    return true;
  };

  /* ---------------- PREVIEW URLS ---------------- */
  const avatarPreview = avatarFile
    ? URL.createObjectURL(avatarFile)
    : getAvatarUrl(profile);

  const bannerPreview = bannerFile
    ? URL.createObjectURL(bannerFile)
    : getProfileBanner(profile);

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!username.trim()) return;

    setLoading(true);

    try {
      let avatarUrl = profile.avatar_url;
      let bannerUrl =
        profile.banner_url || null;

      /* ---------- AVATAR ---------- */
      if (
        avatarFile &&
        validateFile(avatarFile)
      ) {
        avatarUrl = await uploadAvatar(
          avatarFile,
          profile.id
        );
      }

      /* ---------- BANNER ---------- */
      if (
        bannerFile &&
        validateFile(bannerFile)
      ) {
        const fileName = `banner-${profile.id}-${Date.now()}`;

        const { error } =
          await supabase.storage
            .from("banners")
            .upload(fileName, bannerFile);

        if (error) throw error;

        const { data } =
          supabase.storage
            .from("banners")
            .getPublicUrl(fileName);

        bannerUrl = data.publicUrl;
      }

      /* ---------- UPDATE PROFILE ---------- */
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;

      /* ---------- UPDATE UI ---------- */
      setProfile((prev) => ({
        ...prev,
        username,
        bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      }));

      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* HEADER */}
        <div style={styles.topBar}>
          <button
            onClick={onClose}
            style={styles.closeBtn}
          >
            ✕
          </button>

          <h2 style={styles.title}>
            Edit profile
          </h2>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              ...styles.saveBtn,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>

        {/* BANNER */}
        <div style={styles.bannerWrap}>
          {bannerPreview.startsWith("http") ? (
            <img
              src={bannerPreview}
              alt="banner"
              style={styles.banner}
            />
          ) : (
            <div
              style={{
                ...styles.banner,
                background: bannerPreview,
              }}
            />
          )}

          <div style={styles.avatarWrap}>
            <img
              src={avatarPreview}
              alt="avatar"
              style={styles.avatar}
            />
          </div>
        </div>

        {/* BANNER INPUT */}
        <label style={styles.label}>
          Banner image
        </label>

        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={(e) =>
            setBannerFile(
              e.target.files?.[0] || null
            )
          }
        />

        {/* AVATAR INPUT */}
        <label style={styles.label}>
          Avatar image
        </label>

        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={(e) =>
            setAvatarFile(
              e.target.files?.[0] || null
            )
          }
        />

        {/* USERNAME */}
        <label style={styles.label}>
          Username
        </label>

        <input
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          style={styles.input}
        />

        {/* BIO */}
        <label style={styles.label}>
          Bio
        </label>

        <textarea
          value={bio}
          onChange={(e) =>
            setBio(e.target.value)
          }
          style={styles.textarea}
          placeholder="Tell people about yourself"
        />
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },

  modal: {
    width: "100%",
    maxWidth: "600px",
    background: "#fff",
    borderRadius: "18px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: "1px solid #eee",
  },

  title: {
    margin: 0,
    fontSize: "18px",
  },

  closeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
  },

  saveBtn: {
    border: "none",
    background: "#111",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "999px",
    fontWeight: "700",
    cursor: "pointer",
  },

  bannerWrap: {
    position: "relative",
    marginBottom: "70px",
  },

  banner: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    background: "#f3f3f3",
  },

  avatarWrap: {
    position: "absolute",
    bottom: "-55px",
    left: "18px",
    background: "#fff",
    borderRadius: "50%",
    padding: "4px",
  },

  avatar: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
  },

  label: {
    fontSize: "13px",
    fontWeight: "700",
    margin: "10px 18px 6px",
  },

  input: {
    margin: "0 18px",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    fontSize: "14px",
  },

  textarea: {
    margin: "0 18px 18px",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    fontSize: "14px",
    minHeight: "100px",
    resize: "vertical",
  },
};