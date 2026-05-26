import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { uploadAvatar } from "../utils/avatarUpload";

const baseFont =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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

export default function ProfileSetup() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const [xUsername, setXUsername] = useState("");
  const [threadsUsername, setThreadsUsername] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarX, setAvatarX] = useState(0);
  const [avatarY, setAvatarY] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data?.user) {
        navigate("/login", { replace: true });
        return;
      }

      setUser(data.user);
    };

    loadUser();
  }, [navigate]);

  useEffect(() => {
    const checkUsername = async () => {
      const cleanUsername = username
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase();

      if (!cleanUsername) {
        setUsernameStatus(null);
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
  }, [username]);

  const resetAvatarPosition = () => {
    setAvatarZoom(1);
    setAvatarX(0);
    setAvatarY(0);
  };

  const handleAvatarChange = (file) => {
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      resetAvatarPosition();
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    resetAvatarPosition();
  };

  const handleSave = async () => {
    setErrorMsg("");
    setShowErrors(true);

    if (!user) return;

    if (!displayName.trim()) {
      setErrorMsg("Please enter a display name.");
      return;
    }

    if (!username.trim()) {
      setErrorMsg("Please choose a username.");
      return;
    }

    if (usernameStatus !== "available") {
      setErrorMsg("Please choose an available username.");
      return;
    }

    setLoading(true);

    try {
      const cleanUsername = username
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase();

      let avatarUrl = null;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, user.id);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          full_name: displayName.trim() || null,
          avatar_url: avatarUrl,
          x_username: cleanSocialUsername(xUsername) || null,
          threads_username: cleanSocialUsername(threadsUsername) || null,
          tiktok_username: cleanSocialUsername(tiktokUsername) || null,
          profile_completed: true,
        })
        .eq("id", user.id);

      if (error) {
        console.error("PROFILE SAVE ERROR:", error);
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setErrorMsg(err.message || "Profile setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Set up your profile</h2>

        <p style={styles.subtitle}>
          Choose a username before entering the app. You can add a profile
          picture and social links now or later.
        </p>

        <label style={styles.label}>Display name</label>

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="John Doe"
          style={{
            ...styles.input,
            border:
              showErrors && !displayName.trim()
                ? "1px solid #d93025"
                : "1px solid #ddd",
          }}
        />

        {showErrors && !displayName.trim() && (
          <div style={styles.requiredText}>Display name is required.</div>
        )}

        <label style={styles.label}>Username</label>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => setUsernameTouched(true)}
          placeholder="marthastuart"
          style={{
            ...styles.input,
            border:
              (showErrors || usernameTouched) && !username.trim()
                ? "1px solid #d93025"
                : "1px solid #ddd",
          }}
        />

        {(showErrors || usernameTouched) && !username.trim() && (
          <div style={styles.requiredText}>Username is required.</div>
        )}

        {username.trim() && (
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
              value={xUsername}
              onChange={(e) => setXUsername(e.target.value)}
              placeholder="username"
              style={styles.socialInput}
            />
          </div>

          <div style={styles.socialInputWrap}>
            <span style={styles.socialIcon}>@</span>
            <input
              value={threadsUsername}
              onChange={(e) => setThreadsUsername(e.target.value)}
              placeholder="threads username"
              style={styles.socialInput}
            />
          </div>

          <div style={styles.socialInputWrap}>
            <span style={styles.socialIcon}>♪</span>
            <input
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              placeholder="tiktok username"
              style={styles.socialInput}
            />
          </div>
        </div>

        <p style={styles.optionalText}>
          Add only your username, not the full link.
        </p>

        <label style={styles.label}>Profile picture</label>

        <label style={styles.uploadBox}>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
            style={styles.hiddenFile}
          />

          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Profile preview"
              style={{
                ...styles.previewImage,
                transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarZoom})`,
              }}
            />
          ) : (
            <div style={styles.uploadInner}>
              <div style={styles.cameraIcon}>📷</div>
              <div style={styles.uploadText}>Upload</div>
            </div>
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

            <label style={styles.smallLabel}>
              Move profile image left / right
            </label>
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
          </>
        )}

        <p style={styles.optionalText}>You can add this later!</p>

        {avatarPreview && (
          <button
            type="button"
            onClick={() => handleAvatarChange(null)}
            style={styles.removePhotoBtn}
          >
            Remove photo
          </button>
        )}

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}

        <button
          onClick={handleSave}
          disabled={
            loading ||
            !displayName.trim() ||
            !username.trim() ||
            usernameStatus !== "available"
          }
          style={{
            ...styles.button,
            opacity:
              loading ||
              !displayName.trim() ||
              !username.trim() ||
              usernameStatus !== "available"
                ? 0.6
                : 1,
          }}
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f6f6f6",
    padding: "20px",
    fontFamily: baseFont,
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "16px",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#56566f",
    textAlign: "center",
  },

  subtitle: {
    margin: "4px 0 10px",
    fontSize: "14px",
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 1.5,
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#56566f",
  },

  input: {
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontFamily: baseFont,
  },

  socialStack: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
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
    fontFamily: baseFont,
    color: "#56566f",
  },

  statusText: {
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    marginTop: "-2px",
  },

  requiredText: {
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    marginTop: "-2px",
    color: "#d93025",
  },

  uploadBox: {
    width: "180px",
    height: "180px",
    border: "2px dashed #8bb9ee",
    borderRadius: "18px",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "center",
  },

  hiddenFile: {
    display: "none",
  },

  uploadInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    color: "#4d94d8",
  },

  cameraIcon: {
    fontSize: "38px",
  },

  uploadText: {
    fontSize: "18px",
    fontWeight: "700",
  },

  smallLabel: {
    display: "block",
    fontSize: "12px",
    opacity: 0.7,
    marginBottom: "4px",
    textAlign: "center",
    color: "#56566f",
  },

  slider: {
    width: "100%",
    marginBottom: "10px",
  },

  optionalText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#56566f",
    opacity: 0.55,
    textAlign: "center",
    marginTop: "-2px",
    lineHeight: 1.4,
  },

  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transition: "transform 0.1s ease",
  },

  removePhotoBtn: {
    border: "none",
    background: "transparent",
    color: "#56566f",
    cursor: "pointer",
    fontSize: "12px",
    textDecoration: "underline",
    alignSelf: "center",
  },

  button: {
    marginTop: "10px",
    padding: "13px",
    borderRadius: "999px",
    border: "1px solid #d7d7dc",
    background: "#56566f",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    fontFamily: baseFont,
  },

  error: {
    color: "#b00020",
    fontSize: "13px",
    margin: 0,
    textAlign: "center",
  },
};