import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const [loadingAction, setLoadingAction] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isBusy = loadingAction !== null;
  const formDisabled = isBusy || !loginId.trim() || !password;

  const resolveEmail = async () => {
    const value = loginId.trim().toLowerCase();

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

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoadingAction("login");
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const email = await resolveEmail();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data?.session) {
        setErrorMsg("Login worked, but no session was returned.");
        return;
      }

      navigate("/", { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Login failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSignUp = async () => {
    setLoadingAction("signup");
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (!loginId.includes("@")) {
        setErrorMsg("Please use an email address to create an account.");
        return;
      }

      const cleanEmail = loginId.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data?.user) {
        setErrorMsg("Signup failed.");
        return;
      }

      await supabase.from("profiles").upsert({
  id: data.user.id,
  email: cleanEmail,
  username: null,
  profile_completed: false,
});

      navigate("/profile-setup", { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Signup failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h2 style={styles.title}>Login</h2>

        <input
          type="text"
          placeholder="Email or username"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
        {successMsg && <p style={styles.success}>{successMsg}</p>}

        <button
          type="submit"
          disabled={formDisabled}
          style={{
            ...styles.primaryButton,
            opacity: formDisabled ? 0.6 : 1,
          }}
        >
          {loadingAction === "login" ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={handleSignUp}
          disabled={formDisabled}
          style={{
            ...styles.secondaryButton,
            opacity: formDisabled ? 0.6 : 1,
          }}
        >
          {loadingAction === "signup" ? "Creating account..." : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          disabled={isBusy}
          style={styles.forgotButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}

const baseFont =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
  },

  input: {
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontFamily: baseFont,
    fontWeight: "500",
  },

  primaryButton: {
    padding: "13px",
    borderRadius: "999px",
    border: "1px solid #d7d7dc",
    background: "#56566f",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    fontFamily: baseFont,
    marginTop: "4px",
    letterSpacing: "0.03em",
    transition: "all 0.15s ease",
  },

  secondaryButton: {
    padding: "13px",
    borderRadius: "999px",
    border: "1px solid #1d9bf0",
    background: "#1d9bf0",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    fontFamily: baseFont,
    marginTop: "6px",
    letterSpacing: "0.03em",
    transition: "all 0.15s ease",
  },

  forgotButton: {
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
    fontFamily: baseFont,
  },

  success: {
    color: "#137333",
    fontSize: "13px",
    margin: 0,
    fontFamily: baseFont,
  },
};