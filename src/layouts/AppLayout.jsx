import { Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { resetDemoSandbox } from "../utils/demoSandbox";
import { isDemoUser } from "../utils/demoUser";
import { demoNotifications } from "../utils/demoData";

export default function AppLayout() {
  const location = useLocation();

  const [userId, setUserId] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isAdminOrMod, setIsAdminOrMod] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadUnreadNotifications = useCallback(async (currentUserId = userId) => {
  if (!currentUserId) return;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (isDemoUser(user)) {
    setUnreadNotifications(
      demoNotifications.filter((n) => !n.is_read).length
    );
    return;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", currentUserId)
    .eq("is_read", false);

  if (!error) {
    setUnreadNotifications(count || 0);
  }
}, [userId]);

  // 👤 GET USER ID FOR PROFILE ROUTE
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
      if (isDemoUser(data?.user)) {
        setUnreadNotifications(
          demoNotifications.filter((n) => !n.is_read).length
        );
        setIsAdminOrMod(true);
        return;
      }
      const currentUserId = data?.user?.id;

      if (!currentUserId) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", currentUserId)
        .eq("is_read", false);

      setUnreadNotifications(count || 0);
    };

    getUser();
  }, []);

useEffect(() => {
  if (!userId) return;

  const run = async () => {
    await loadUnreadNotifications(userId);
  };

  run();
}, [userId, location.pathname, loadUnreadNotifications]);

    useEffect(() => {
  if (!userId) return;

  const checkAdminOrMod = async () => {
    const { data, error } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .in("role", ["admin", "mod"])
      .limit(1);

    if (!error) {
      setIsAdminOrMod((data || []).length > 0);
    }
  };

  checkAdminOrMod();
}, [userId]);

useEffect(() => {
  if (!userId) return;

  const channel = supabase
    .channel(`notifications-sidebar-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      () => {
        loadUnreadNotifications(userId);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId, loadUnreadNotifications]);


useEffect(() => {
  const handleFocus = () => {
    if (userId) {
      loadUnreadNotifications(userId);
    }
  };

  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("focus", handleFocus);
  };
}, [userId, loadUnreadNotifications]);


  const logout = async () => {
    resetDemoSandbox();

    await supabase.auth.signOut();

    window.location.href = "/";
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-layout" style={styles.container}>
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="mobile-logo-icon">🏪</span>

        <div className="mobile-logo-text-wrap">
          <span className="mobile-logo-the">The</span>

          <span className="mobile-logo-booth">Booth</span>
        </div>
      </button>

      {sidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* 🧭 LEFT SIDEBAR */}
      <aside
        className={`app-sidebar ${sidebarOpen ? "mobile-sidebar-open" : ""}`}
        style={styles.sidebar}
      >

        <div style={styles.logo}>
          <div style={styles.logoLeft}>
            <span style={styles.logoIcon}>🏪</span>

            <div style={styles.logoTextWrap}>
              <span style={styles.logoThe}>The</span>
              <span style={styles.logoBooth}>Booth</span>
            </div>
          </div>

          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav style={styles.nav}>
          {/* 🏠 HOME */}
          <Link
            style={{
              ...styles.link,
              ...(isActive("/") ? styles.active : {}),
            }}
            to="/"
            onClick={() => setSidebarOpen(false)}
          >
            🏠 Home
          </Link>

          {/* 🔍 DISCOVER */}
          <Link
            style={{
              ...styles.link,
              ...(isActive("/discover") ? styles.active : {}),
            }}
            to="/discover"
            onClick={() => setSidebarOpen(false)}
          >
            🔍 Discover
          </Link>

          {/* 🏘️ COMMUNITIES */}
          <Link
            style={{
              ...styles.link,
              ...(isActive("/communities") ? styles.active : {}),
            }}
            to="/communities"
            onClick={() => setSidebarOpen(false)}
          >
            🏘️ Communities
          </Link>

          {/* 🔖 BOOKMARKS */}
          <Link
            style={{
              ...styles.link,
              ...(isActive("/bookmarks") ? styles.active : {}),
            }}
            to="/bookmarks"
            onClick={() => setSidebarOpen(false)}
          >
            🔖 Bookmarks
          </Link>

          {/* 🔔 NOTIFICATIONS */}
          <Link
            style={{
              ...styles.link,
              ...(isActive("/notifications") ? styles.active : {}),
            }}
            to="/notifications"
            onClick={() => setSidebarOpen(false)}
          >
            🔔 Notifications
            {isAdminOrMod && unreadNotifications > 0 && (
              <span style={styles.notificationBadge}>
                {unreadNotifications}
              </span>
            )}
          </Link>

          {/* 👤 PROFILE (FIXED 🚀) */}
          <Link
            style={{
              ...styles.link,
              ...(location.pathname.startsWith("/profile")
                ? styles.active
                : {}),
            }}
            to={userId ? `/profile/${userId}` : "/profile/unknown"}
            onClick={() => setSidebarOpen(false)}
          >
            👤 Profile
          </Link>
        </nav>

        <button style={styles.logout} onClick={logout}>
          🚪 Logout
        </button>
      </aside>

      {/* 📰 MAIN CONTENT */}
      <main
        className={`app-main ${
          location.pathname.startsWith("/post/") ||
          location.pathname.startsWith("/comment/")
            ? "app-main-post"
            : ""
        }`}
        style={{
          ...styles.main,
          ...(location.pathname.startsWith("/post/") ||
          location.pathname.startsWith("/comment/")
            ? styles.postMain
            : {}),
        }}
      >
        <Outlet
          context={{
            setUnreadNotifications,
            loadUnreadNotifications,
          }}
        />
      </main>

      {/* ➕ RIGHT PANEL */}
      <aside className="app-right" style={styles.right}>
        <div style={styles.panel}>
          <h4>✨ Suggestions</h4>
          <p style={{ fontSize: "14px", opacity: 0.7 }}>
            (Trends, suggested communities, etc. later)
          </p>
        </div>
      </aside>
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "220px minmax(0, 1fr) 240px",
    minHeight: "100vh",
    width: "100%",
    background: "#f6f6f6",
    fontFamily: "system-ui, sans-serif",
    overflowX: "hidden",
  },

  sidebar: {
    width: "220px",
    padding: "16px",
    borderRight: "1px solid #e6e0e9",
    background: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    height: "100vh",
    boxSizing: "border-box",
  },

logo: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "20px",
},

  logoIcon: {
    fontSize: "26px",
    lineHeight: 1,
  },

  logoTextWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: "4px",
    lineHeight: 1,
  },

  logoThe: {
    fontSize: "11px",
    opacity: 0.8,
    fontWeight: "500",
    color: "#1c1b1f",
    position: "relative",
    top: "-1px",
  },

  logoBooth: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#1c1b1f",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  link: {
    textDecoration: "none",
    color: "#1c1b1f",
    fontSize: "15px",
    padding: "10px",
    borderRadius: "12px",
  },

  notificationBadge: {
    marginLeft: "8px",
    minWidth: "18px",
    height: "18px",
    borderRadius: "999px",
    background: "#1d9bf0",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 5px",
    boxSizing: "border-box",
    verticalAlign: "middle",
  },

  active: {
    background: "#ece6f0",
    fontWeight: "500",
  },

  logout: {
    marginTop: "20px",
    background: "#6750A4",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "12px",
    cursor: "pointer",
  },

  main: {
    width: "100%",
    maxWidth: "900px",
    minWidth: 0,
    padding: "20px",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  postMain: {
    maxWidth: "760px",
    padding:0,
    background: "#fcfcfc",
  },

  right: {
    width: "240px",
    padding: "16px",
    borderLeft: "1px solid #e6e0e9",
    background: "#fff",
    position: "sticky",
    top: 0,
    height: "100vh",
    boxSizing: "border-box",
  },

  panel: {
    background: "#f6f6f6",
    padding: "12px",
    borderRadius: "12px",
  },

  logoLeft: {
  display: "flex",
  alignItems: "center",
  gap: "10px",
},

};