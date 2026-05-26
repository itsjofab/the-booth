import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const baseFont =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] =
    useState("");

  const passwordsEntered =
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  const passwordsMatch =
    password === confirmPassword;

  const updatePassword = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!passwordsMatch) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setSuccessMsg(
      "Password updated. Redirecting..."
    );

    setTimeout(() => {
      navigate("/login", {
        replace: true,
      });
    }, 1500);
  };

  return (
    <div style={styles.container}>
      <form
        onSubmit={updatePassword}
        style={styles.card}
      >
        <h2 style={styles.title}>
          Reset password
        </h2>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(
              e.target.value
            )
          }
          style={styles.input}
        />

        {/* ✅ PASSWORD MATCH UI */}
        {passwordsEntered && (
          <div
            style={{
              ...styles.matchText,
              color: passwordsMatch
                ? "#137333"
                : "#b00020",
            }}
          >
            {passwordsMatch
              ? "✅ Passwords match"
              : "❌ Passwords do not match"}
          </div>
        )}

        {errorMsg && (
          <p style={styles.error}>
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p style={styles.success}>
            {successMsg}
          </p>
        )}

        <button
          disabled={
            loading ||
            !password.trim() ||
            !confirmPassword.trim() ||
            !passwordsMatch
          }
          style={{
            ...styles.button,
            opacity:
              loading ||
              !password.trim() ||
              !confirmPassword.trim() ||
              !passwordsMatch
                ? 0.6
                : 1,
          }}
        >
          {loading
            ? "Updating..."
            : "Update password"}
        </button>
      </form>
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
    maxWidth: "380px",
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    fontFamily: baseFont,
  },

  title: {
    margin: "0 0 8px",
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "0.01em",
    color: "#56566f",
    fontFamily: baseFont,
    textAlign: "center",
  },

  input: {
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontFamily: baseFont,
    fontWeight: "500",
  },

  matchText: {
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    marginTop: "-2px",
  },

  button: {
    padding: "13px",
    borderRadius: "999px",
    border: "1px solid #d7d7dc",
    background: "#56566f",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    fontFamily: baseFont,
    marginTop: "6px",
    letterSpacing: "0.03em",
    transition: "all 0.15s ease",
  },

  error: {
    color: "#b00020",
    fontSize: "13px",
    margin: 0,
    fontFamily: baseFont,
    textAlign: "center",
  },

  success: {
    color: "#137333",
    fontSize: "13px",
    margin: 0,
    fontFamily: baseFont,
    textAlign: "center",
  },
};