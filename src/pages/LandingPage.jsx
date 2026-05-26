import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  const [deferredPrompt, setDeferredPrompt] =
    useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
    };
  }, []);

  const handleInstall = async () => {
    // iPhone / Safari
    const isIOS =
      /iphone|ipad|ipod/i.test(
        window.navigator.userAgent
      );

    if (isIOS) {
      alert(
        "To install The Booth:\n\nTap Share → Add to Home Screen"
      );
      return;
    }

    // Android / Chrome / Desktop
    if (deferredPrompt) {
      deferredPrompt.prompt();

      const { outcome } =
        await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏪</span>

          <div style={styles.logoTextWrap}>
            <span style={styles.logoThe}>The</span>
            <span style={styles.logoBooth}>
              Booth
            </span>
          </div>
        </div>

        <p style={styles.subtitle}>
          Join communities, share posts,
          and stay connected.
        </p>

        <button
          type="button"
          onClick={() => navigate("/login")}
          style={styles.button}
        >
          Continue
        </button>

        <button
          type="button"
          onClick={handleInstall}
          style={styles.installButton}
        >
          ⬇️ Download App
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f6f6f6",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "22px",
    padding: "34px 24px",
    textAlign: "center",
    boxShadow:
      "0 12px 30px rgba(0,0,0,0.06)",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "16px",
  },

  logoIcon: {
    fontSize: "34px",
    lineHeight: 1,
  },

  logoTextWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    lineHeight: 1,
  },

  logoThe: {
    fontSize: "14px",
    opacity: 0.8,
    fontWeight: "500",
    color: "#1c1b1f",
  },

  logoBooth: {
    fontSize: "30px",
    fontWeight: "800",
    color: "#1c1b1f",
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px",
  },

  button: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "15px",
  },

  installButton: {
    marginTop: "12px",
    border: "1px solid #ddd",
    borderRadius: "999px",
    background: "#fff",
    color: "#111",
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
  },
};