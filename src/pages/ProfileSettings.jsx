import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { uploadAvatar } from "../utils/avatarUpload";
function cleanSocialUsername(value) {
  return value
    .trim()
    .replace("@", "")
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/^x\.com\//i, "")
    .replace(/^twitter\.com\//i, "")
    .replace(/^threads\.net\/@?/i, "")
    .replace(/^tiktok\.com\/@?/i, "")
    .split("/")[0]
    .replace(/[^a-zA-Z0-9._]/g, "");
}

export default function ProfileSettings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    avatar_url: "",
    banner_url: "",

    x_username: "",
    threads_username: "",
    tiktok_username: "",
  });

  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [displayNameTouched, setDisplayNameTouched] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarX, setAvatarX] = useState(0);
  const [avatarY, setAvatarY] = useState(0);

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerX, setBannerX] = useState(0);
  const [bannerY, setBannerY] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user;

      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      const { data } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          bio,
          avatar_url,
          banner_url,
          x_username,
          threads_username,
          tiktok_username
        `)
        .eq("id", currentUser.id)
        .maybeSingle();

      if (data) {
        setProfile({
          username: data.username || "",
          full_name: data.full_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          banner_url: data.banner_url || "",

          x_username: data.x_username || "",
          threads_username: data.threads_username || "",
          tiktok_username: data.tiktok_username || "",
        });

        setOriginalUsername(data.username || "");
        setUsernameStatus("available");
        setAvatarPreview(data.avatar_url || null);
        setBannerPreview(data.banner_url || null);
      }

      setLoading(false);
    };

    load();
  }, [navigate]);

  useEffect(() => {
    const checkUsername = async () => {
      const cleanUsername = profile.username
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase();

      const cleanOriginal = originalUsername
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase();

      if (!cleanUsername) {
        setUsernameStatus(null);
        return;
      }

      if (cleanUsername === cleanOriginal) {
        setUsernameStatus("available");
        return;
      }

      const { data: exists, error } = await supabase.rpc("username_exists", {
        input_username: cleanUsername,
      });

      if (error) {
        console.error("USERNAME CHECK ERROR:", error);
        setUsernameStatus(null);
        return;
      }

      setUsernameStatus(exists ? "taken" : "available");
    };

    const timeout = setTimeout(checkUsername, 250);
    return () => clearTimeout(timeout);
  }, [profile.username, originalUsername]);

  const handleSave = async () => {
    if (!user) return;

  if (!profile.full_name.trim()) {
    alert("Must have a name here.");
    return;
  }

  if (usernameStatus !== "available") {
    alert("Please choose an available username.");
    return;
  }

    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url;
      let bannerUrl = profile.banner_url;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, user.id);
      }

      if (bannerFile) {
        bannerUrl = await uploadAvatar(bannerFile, `${user.id}_banner`);
      }

      const cleanUsername = profile.username
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase();

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: cleanUsername,
        full_name: profile.full_name.trim(),
        bio: profile.bio.trim(),

        x_username:
          cleanSocialUsername(profile.x_username) || null,

        threads_username:
          cleanSocialUsername(profile.threads_username) || null,

        tiktok_username:
          cleanSocialUsername(profile.tiktok_username) || null,

        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      alert("Profile updated!");
      navigate(`/profile/${user.id}`);
    } catch (err) {
      console.error("SAVE PROFILE ERROR:", err);
      alert(err.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("DELETE ACCOUNT ERROR:", err);
      alert(err.message || "Could not delete account.");
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button
          type="button"
          onClick={() => navigate(user ? `/profile/${user.id}` : "/")}
          style={styles.backBtn}
        >
          ←
        </button>

        <h2 style={styles.title}>Edit profile</h2>

        <div />
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Profile details</h3>

        <label style={styles.label}>Banner image</label>

        <label style={styles.bannerPicker}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;

              setBannerFile(file);
              setBannerPreview(
                file ? URL.createObjectURL(file) : profile.banner_url || null
              );
              setBannerZoom(1);
              setBannerX(0);
              setBannerY(0);
            }}
            style={styles.hiddenFile}
          />

          {bannerPreview ? (
            <div style={styles.previewWrap}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setBannerFile(null);
                  setBannerPreview(null);

                  setProfile((prev) => ({
                    ...prev,
                    banner_url: "",
                  }));

                  setBannerZoom(1);
                  setBannerX(0);
                  setBannerY(0);
                }}
                style={styles.removePreviewBtn}
              >
                ✕
              </button>

              <img
                src={bannerPreview}
                alt="banner preview"
                style={{
                  ...styles.bannerPreview,
                  transform: `translate(${bannerX}px, ${bannerY}px) scale(${bannerZoom})`,
                }}
              />
            </div>
          ) : (
            <div style={styles.bannerPlaceholder}>Choose banner</div>
          )}
        </label>

        {bannerPreview && (
          <>
            <label style={styles.smallLabel}>Zoom</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={bannerZoom}
              onChange={(e) => setBannerZoom(Number(e.target.value))}
              style={styles.slider}
            />

            <label style={styles.smallLabel}>Move left / right</label>
            <input
              type="range"
              min="-80"
              max="80"
              value={bannerX}
              onChange={(e) => setBannerX(Number(e.target.value))}
              style={styles.slider}
            />

            <label style={styles.smallLabel}>Move up / down</label>
            <input
              type="range"
              min="-60"
              max="60"
              value={bannerY}
              onChange={(e) => setBannerY(Number(e.target.value))}
              style={styles.slider}
            />
            {bannerFile && (
              <button
                type="button"
                onClick={() => {
                  setBannerFile(null);
                  setBannerPreview(profile.banner_url || null);
                  setBannerZoom(1);
                  setBannerX(0);
                  setBannerY(0);
                }}
                style={styles.cancelImageBtn}
              >
                Cancel selected banner
              </button>
            )}
          </>
        )}

        <label style={styles.label}>Profile image</label>

        <label style={styles.avatarPicker}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;

              setAvatarFile(file);
              setAvatarPreview(
                file ? URL.createObjectURL(file) : profile.avatar_url || null
              );
              setAvatarZoom(1);
              setAvatarX(0);
              setAvatarY(0);
            }}
            style={styles.hiddenFile}
          />

          {avatarPreview ? (
            <div style={styles.previewWrap}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setAvatarFile(null);
                  setAvatarPreview(null);

                  setProfile((prev) => ({
                    ...prev,
                    avatar_url: "",
                  }));

                  setAvatarZoom(1);
                  setAvatarX(0);
                  setAvatarY(0);
                }}
                style={styles.removePreviewBtn}
              >
                ✕
              </button>

              <img
                src={avatarPreview}
                alt="avatar preview"
                style={{
                  ...styles.avatarPreview,
                  transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarZoom})`,
                }}
              />
            </div>
          ) : (
            <div style={styles.avatarPlaceholder}>+</div>
          )}
        </label>

        {avatarPreview && (
          <>
            <label style={styles.smallLabel}>Profile image zoom</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={avatarZoom}
              onChange={(e) => setAvatarZoom(Number(e.target.value))}
              style={styles.slider}
            />

            <label style={styles.smallLabel}>Move profile image left / right</label>
            <input
              type="range"
              min="-40"
              max="40"
              value={avatarX}
              onChange={(e) => setAvatarX(Number(e.target.value))}
              style={styles.slider}
            />

            <label style={styles.smallLabel}>Move profile image up / down</label>
            <input
              type="range"
              min="-40"
              max="40"
              value={avatarY}
              onChange={(e) => setAvatarY(Number(e.target.value))}
              style={styles.slider}
            />
            {avatarFile && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(profile.avatar_url || null);
                  setAvatarZoom(1);
                  setAvatarX(0);
                  setAvatarY(0);
                }}
                style={styles.cancelImageBtn}
              >
                Cancel selected profile image
              </button>
            )}
          </>
        )}

        <label style={styles.label}>Display name</label>

        <input
          value={profile.full_name}
          onChange={(e) =>
            setProfile({
              ...profile,
              full_name: e.target.value,
            })
          }
          onBlur={() => setDisplayNameTouched(true)}
          style={{
            ...styles.input,
            border:
              displayNameTouched &&
              !profile.full_name.trim()
                ? "1px solid #d93025"
                : "1px solid #ddd",
          }}
          placeholder="Display name"
        />

        {displayNameTouched &&
          !profile.full_name.trim() && (
            <div style={styles.requiredText}>
              Must have a name here.
            </div>
        )}

        <label style={styles.label}>Username</label>

        <input
          value={profile.username}
          onChange={(e) =>
            setProfile({
              ...profile,
              username: e.target.value,
            })
          }
          onBlur={() => setUsernameTouched(true)}
          style={{
            ...styles.input,
            border:
              usernameTouched && !profile.username.trim()
                ? "1px solid #d93025"
                : "1px solid #ddd",
          }}
          placeholder="Username"
        />

        {usernameTouched && !profile.username.trim() && (
          <div style={styles.requiredText}>Username is required.</div>
        )}

        {profile.username.trim() && (
          <div
            style={{
              ...styles.statusText,
              color: usernameStatus === "available" ? "#137333" : "#b00025",
            }}
          >
            {usernameStatus === "available"
              ? "✅ Available"
              : "❌ Not available"}
          </div>
        )}


        <label style={styles.label}>Social profiles</label>

        <div style={styles.socialStack}>
          <div style={styles.socialInputWrap}>
            <span style={styles.socialIcon}>𝕏</span>

            <input
              value={profile.x_username}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  x_username: e.target.value,
                })
              }
              placeholder="username"
              style={styles.socialInput}
            />
          </div>

          <div style={styles.socialInputWrap}>
            <span style={styles.socialIcon}>@</span>

            <input
              value={profile.threads_username}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  threads_username: e.target.value,
                })
              }
              placeholder="threads username"
              style={styles.socialInput}
            />
          </div>

          <div style={styles.socialInputWrap}>
            <span style={styles.socialIcon}>♪</span>

            <input
              value={profile.tiktok_username}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  tiktok_username: e.target.value,
                })
              }
              placeholder="tiktok username"
              style={styles.socialInput}
            />
          </div>
        </div>

        <p style={styles.optionalText}>
          Add only your username, not the full link.
        </p>





        <label style={styles.label}>Bio</label>

        <textarea
          value={profile.bio}
          onChange={(e) =>
            setProfile({
              ...profile,
              bio: e.target.value,
            })
          }
          style={styles.textarea}
          placeholder="Tell me about yourself"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            !profile.full_name.trim() ||
            !profile.username.trim() ||
            usernameStatus !== "available"
          }
          style={{
            ...styles.saveBtn,
            opacity:
              saving ||
              !profile.full_name.trim() ||
              !profile.username.trim() ||
              usernameStatus !== "available"
                ? 0.6
                : 1,
          }}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        <button
          type="button"
          onClick={handleDeleteAccount}
          style={styles.deleteBtn}
        >
          Delete account
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "80vh",
  },

  loading: {
    padding: "20px",
    textAlign: "center",
  },

  topBar: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    alignItems: "center",
    marginBottom: "4px",
  },

  backBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "#111",
    cursor: "pointer",
    fontSize: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  title: {
    margin: 0,
    textAlign: "center",
  },

  card: {
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #eee",
    background: "#fff",
    marginBottom: "12px",
    textAlign: "left",
  },

  sectionTitle: {
    fontSize: "15px",
    margin: "0 0 12px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "6px",
  },

  hiddenFile: {
    display: "none",
  },

  bannerPicker: {
    width: "100%",
    height: "150px",
    borderRadius: "14px",
    border: "1px dashed #bbb",
    background: "#f6f6f6",
    overflow: "hidden",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    cursor: "pointer",
  },

  bannerPreview: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transition: "transform 0.1s ease",
  },

  bannerPlaceholder: {
    fontSize: "14px",
    opacity: 0.6,
  },

  smallLabel: {
    display: "block",
    fontSize: "12px",
    opacity: 0.7,
    marginBottom: "4px",
  },

  slider: {
    width: "100%",
    marginBottom: "10px",
  },

  avatarPicker: {
    width: "96px",
    height: "96px",
    borderRadius: "50%",
    border: "2px dashed #bbb",
    background: "#f6f6f6",
    overflow: "hidden",
    margin: "0 auto 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  avatarPreview: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transition: "transform 0.1s ease",
  },

  avatarPlaceholder: {
    fontSize: "28px",
    opacity: 0.5,
  },

  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "8px",
    boxSizing: "border-box",
  },

  statusText: {
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    marginTop: "-4px",
    marginBottom: "8px",
  },

  requiredText: {
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    marginTop: "-4px",
    marginBottom: "8px",
    color: "#d93025",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "12px",
    boxSizing: "border-box",
    resize: "vertical",
  },

  saveBtn: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  cancelImageBtn: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#1d9bf0",
    color: "#fff",
    padding: "8px",
    cursor: "pointer",
    fontWeight: "700",
    marginBottom: "12px",
  },


  previewWrap: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  removePreviewBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.72)",
    color: "#fff",
    cursor: "pointer",
    zIndex: 2,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteBtn: {
    marginTop: "10px",
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#d93025",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  socialStack: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "10px",
  },

  socialInputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 11px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#fff",
  },

  socialIcon: {
    width: "18px",
    textAlign: "center",
    color: "#56566f",
    opacity: 0.65,
    fontSize: "14px",
    fontWeight: "700",
  },

  socialInput: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "11px 0",
    fontSize: "14px",
    color: "#56566f",
    background: "transparent",
  },

  optionalText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#56566f",
    opacity: 0.55,
    textAlign: "center",
    marginTop: "-2px",
    marginBottom: "12px",
    lineHeight: 1.4,
  },

};