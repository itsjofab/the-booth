import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const baseFont =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resolveEmail = async () => {
    const value = loginId.trim().toLowerCase();

    if (!value) {
      throw new Error("Please enter your email or username.");
    }

    if (value.includes("@")) {
      return value;
    }

    const { data, error } = await supabase.rpc(
      "get_login_email_by_username",
      {
        input_username: value,
      }
    );

    if (error) throw error;

    if (!data) {
      throw new Error("No account found with that username.");
    }

    return data;
  };

  const sendResetEmail = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const email = await resolveEmail();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg("Password reset email sent. Check your email for the reset link.");
    } catch (err) {
      setErrorMsg(err.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={sendResetEmail} style={styles.card}>
        <h2 style={styles.title}>Forgot password</h2>

        <p style={styles.subtitle}>
          Enter your email or username. If the account exists, we’ll send a
          password reset link.
        </p>

        <input
          type="text"
          placeholder="Email or username"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          style={styles.input}
        />

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
        {successMsg && <p style={styles.success}>{successMsg}</p>}

        <button
          type="submit"
          disabled={loading || !loginId.trim()}
          style={{
            ...styles.button,
            opacity: loading || !loginId.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Sending..." : "Send reset email"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/login")}
          style={styles.backButton}
        >
          Back to login
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
    margin: "0 0 4px",
    fontSize: "22px",
    fontWeight: "700",
    color: "#56566f",
    textAlign: "center",
    fontFamily: baseFont,
  },

  subtitle: {
    margin: "0 0 8px",
    fontSize: "13px",
    opacity: 0.65,
    textAlign: "center",
    lineHeight: 1.45,
  },

  input: {
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontFamily: baseFont,
    fontWeight: "500",
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
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#56566f",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    fontFamily: baseFont,
    padding: "2px 0 4px",
    alignSelf: "center",
    textDecoration: "underline",
    opacity: 0.8,
  },

  error: {
    color: "#b00020",
    fontSize: "13px",
    margin: 0,
    textAlign: "center",
  },

  success: {
    color: "#137333",
    fontSize: "13px",
    margin: 0,
    textAlign: "center",
  },
};