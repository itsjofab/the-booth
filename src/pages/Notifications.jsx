import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useOutletContext } from "react-router-dom";
import PostSkeleton from "../components/PostSkeleton";

export default function Notifications() {
  const navigate = useNavigate();
  const { setUnreadNotifications } = useOutletContext();

  const [isAdminOrMod, setIsAdminOrMod] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading((prev) => {
      if (notifications.length === 0) return true;
      return prev;
    });

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("NOTIFICATIONS ERROR:", error);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("NOTIFICATIONS LOAD ERROR:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notifications.length]);

  useEffect(() => {
    const checkAdminOrMod = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;

      if (!currentUserId) {
        setIsAdminOrMod(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", currentUserId)
        .in("role", ["admin", "mod"])
        .limit(1);

      if (!error) {
        setIsAdminOrMod((data || []).length > 0);
      }
    };

    checkAdminOrMod();
  }, []);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      await Promise.resolve();

      if (!isActive) return;

      await loadNotifications();
    };

    run();

    return () => {
      isActive = false;
    };
  }, [loadNotifications]);

  const refreshNotifications = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const deleteNotification = async (e, notificationId) => {
    e.stopPropagation();

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      alert(error.message || "Could not delete notification.");
      return;
    }

    setNotifications((prev) =>
      prev.filter((item) => item.id !== notificationId)
    );
  };

  const markRead = async (notification) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );

    const title = (notification.title || "").toLowerCase();
    const message = (notification.message || "").toLowerCase();

    const isReport =
      title.includes("report") || message.includes("report");

    const isJoinRequest =
      title.includes("join request") ||
      message.includes("join request") ||
      title.includes("request to join") ||
      message.includes("request to join");

    if (isReport && notification.community_id) {
      navigate(`/c/${notification.community_id}/admin/reports`);
      return;
    }

    if (isJoinRequest && notification.community_id) {
      navigate(`/c/${notification.community_id}/admin/requests`);
      return;
    }

    if (notification.related_post_id) {
      navigate(`/post/${notification.related_post_id}`);
      return;
    }

    if (notification.community_id) {
      navigate(`/c/${notification.community_id}/admin`);
    }
  };

  return (
    <div style={styles.page}>
      <div className="notifications-header" style={styles.header}>
        {isAdminOrMod && (
          <>
            <button
              onClick={refreshNotifications}
              disabled={loading || refreshing}
              className="notifications-refresh-btn"
              style={{
                ...styles.refreshBtn,
                opacity: loading || refreshing ? 0.5 : 1,
              }}
              title="Refresh notifications"
            >
              🔄
            </button>

            <button
              onClick={async () => {
                const unreadIds = notifications
                  .filter((n) => !n.is_read)
                  .map((n) => n.id);

                if (unreadIds.length === 0) return;

                const { error } = await supabase
                  .from("notifications")
                  .update({ is_read: true })
                  .in("id", unreadIds);

                if (error) {
                  alert(error.message || "Could not mark notifications read.");
                  return;
                }

                setNotifications((prev) =>
                  prev.map((item) => ({
                    ...item,
                    is_read: true,
                  }))
                );

                setUnreadNotifications(0);
              }}
              className="notifications-mark-read-btn"
              style={styles.markReadBtn}
              title="Mark all read"
            >
              Mark all read
            </button>
          </>
        )}

        <h2 style={styles.title}>🔔 Notifications</h2>

        <div style={styles.subtitle}>
          Updates from your communities
        </div>
      </div>

      {isAdminOrMod === null ? (
        <div style={styles.feedGap}>
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : !isAdminOrMod ? (
        <div style={styles.memberNotice}>
          <div style={styles.memberNoticeTitle}>
            🔔 Notifications
          </div>

          <div style={styles.memberNoticeText}>
            Feature is currently only used for moderation, more coming soon.
          </div>
        </div>
      ) : (
        <>
          {(loading || refreshing) && (
            <div style={styles.feedGap}>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          )}

          {!loading && !refreshing && notifications.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔔</div>

              <div style={styles.emptyTitle}>
                No notifications yet
              </div>

              <div style={styles.emptyText}>
                Reports, join requests, and moderator updates will appear here.
              </div>
            </div>
          )}

          {!loading && !refreshing && notifications.length > 0 && (
            <>
              <div style={styles.feed}>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => markRead(notification)}
                    style={{
                      ...styles.card,
                      position: "relative",
                      background: notification.is_read ? "#fff" : "#f0f7ff",
                    }}
                  >
                    <span
                      onClick={(e) =>
                        deleteNotification(e, notification.id)
                      }
                      style={styles.deleteBtn}
                      title="Delete notification"
                    >
                      🗑️
                    </span>

                    <div style={styles.cardTitle}>
                      {notification.title}
                    </div>

                    {notification.message && (
                      <div style={styles.message}>
                        {notification.message}
                      </div>
                    )}

                    <div style={styles.date}>
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>

              <div style={styles.endState}>
                <div style={styles.endTitle}>
                  You’re all caught up
                </div>

                <div style={styles.endText}>
                  Those are all your notifications.
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "80vh",
  },

  header: {
    position: "relative",
    marginBottom: "16px",
    paddingTop: "0px",
  },

  title: {
    margin: 0,
    fontSize: "20px",
  },

  subtitle: {
    fontSize: "13px",
    opacity: 0.6,
  },

  refreshBtn: {
    position: "absolute",
    top: "0px",
    right: "0px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
    padding: "0",
  },

  markReadBtn: {
    position: "absolute",
    top: "6px",
    right: "42px",
    transform: "none",
    fontSize: "10px",
    lineHeight: 1,
    background: "#34444f",
    color: "#fff",
    padding: "3px 6px",
    borderRadius: "4px",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    fontWeight: "700",
  },

  memberNotice: {
    marginTop: "40px",
    padding: "28px",
    border: "1px solid #eee",
    borderRadius: "16px",
    background: "#fafafa",
    textAlign: "center",
  },

  memberNoticeTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "10px",
  },

  memberNoticeText: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.5,
  },

  deleteBtn: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "transparent",
    border: "none",
    color: "#777",
    fontSize: "14px",
    cursor: "pointer",
    lineHeight: 1,
  },

  feed: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  feedGap: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  card: {
    width: "100%",
    display: "block",
    textAlign: "left",
    border: "1px solid #eee",
    borderRadius: "14px",
    padding: "14px",
    color: "#111",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  cardTitle: {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  message: {
    fontSize: "13px",
    color: "#555",
    marginBottom: "6px",
  },

  date: {
    fontSize: "12px",
    color: "#777",
  },

  emptyState: {
    textAlign: "center",
    padding: "46px 20px",
    marginTop: "20px",
    border: "1px dashed #ddd",
    borderRadius: "14px",
    background: "#fafafa",
  },

  emptyIcon: {
    fontSize: "30px",
    marginBottom: "10px",
  },

  emptyTitle: {
    fontSize: "17px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  emptyText: {
    fontSize: "14px",
    opacity: 0.6,
  },

  endState: {
    textAlign: "center",
    padding: "26px",
    marginTop: "22px",
    border: "1px solid #eee",
    borderRadius: "14px",
    background: "#fafafa",
  },

  endTitle: {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  endText: {
    fontSize: "14px",
    opacity: 0.6,
  },

};