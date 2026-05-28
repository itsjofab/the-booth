import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { isDemoUser } from "../utils/demoUser";
import { demoReportedPosts } from "../utils/demoData";

export default function CommunityAdminReports() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [reportedPosts, setReportedPosts] = useState([]);

  const canModerate = role === "admin" || role === "mod";

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const demoMode = isDemoUser(user);

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership || !["admin", "mod"].includes(membership.role)) {
        navigate(`/c/${id}`);
        return;
      }

      setRole(membership.role);

      if (demoMode) {
        setReportedPosts(demoReportedPosts);
        setLoading(false);
        return;
      }

      const { data: reportedData, error: reportedError } = await supabase
        .from("posts")
        .select("id, content, image_url, media_url, media_type, gif_url, created_at, user_id")
        .eq("community_id", id)
        .eq("is_reported", true)
        .order("created_at", { ascending: false });

      if (reportedError) {
        console.error("REPORTED POSTS LOAD ERROR:", reportedError);
        setReportedPosts([]);
      } else if (reportedData?.length) {
        const userIds = reportedData.map((p) => p.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = {};
        (profiles || []).forEach((p) => {
          profileMap[p.id] = p;
        });

        setReportedPosts(
          reportedData.map((p) => ({
            ...p,
            profile: profileMap[p.user_id] || null,
          }))
        );
      } else {
        setReportedPosts([]);
      }

      setLoading(false);
    };

    load();
  }, [id, navigate]);

  const hidePost = async (postId) => {
    if (!canModerate) return;

    const { data } = await supabase.auth.getUser();

    if (isDemoUser(data?.user)) {
      setReportedPosts((prev) =>
        prev.filter((p) => p.id !== postId)
      );

      alert("Demo preview: post hidden.");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        is_hidden: true,
        is_reported: false,
      })
      .eq("id", postId);

    if (error) {
      alert("Could not hide post.");
      return;
    }

    setReportedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const clearReport = async (postId) => {
    if (!canModerate) return;

    const { data } = await supabase.auth.getUser();

    if (isDemoUser(data?.user)) {
      setReportedPosts((prev) =>
        prev.filter((p) => p.id !== postId)
      );

      alert("Demo preview: report cleared.");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({ is_reported: false })
      .eq("id", postId);

    if (error) {
      alert("Could not clear report.");
      return;
    }

    setReportedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Loading reported posts...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button
          type="button"
          onClick={() => navigate(`/c/${id}/admin`)}
          style={styles.backBtn}
        >
          ←
        </button>

        <h2 style={styles.title}>Reported posts</h2>

        <div />
      </div>

      <div style={styles.card}>
        {reportedPosts.length === 0 ? (
          <p style={styles.muted}>No reported posts.</p>
        ) : (
          <div style={styles.list}>
            {reportedPosts.map((post) => (
              <div key={post.id} style={styles.reportCard}>
                <div style={styles.userRow}>
                  <img
                    src={
                      post.profile?.avatar_url ||
                      "/default-avatar.png"
                    }
                    alt="user"
                    style={styles.avatar}
                  />

                  <strong>@{post.profile?.username || "user"}</strong>
                </div>

                <p style={styles.postText}>{post.content || "No text"}</p>

                {(post.media_url || post.image_url) &&
                  (post.media_type?.startsWith("video") ? (
                    <video
                      src={post.media_url}
                      controls
                      playsInline
                      preload="metadata"
                      style={styles.postImage}
                    />
                  ) : (
                    <img
                      src={post.media_url || post.image_url}
                      alt="post"
                      style={styles.postImage}
                    />
                  ))}

                {post.gif_url && (
                  <img src={post.gif_url} alt="gif" style={styles.postImage} />
                )}

                {canModerate && (
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      onClick={() => hidePost(post.id)}
                      style={styles.dangerBtn}
                    >
                      Hide post
                    </button>

                    <button
                      type="button"
                      onClick={() => clearReport(post.id)}
                      style={styles.secondaryBtn}
                    >
                      Clear report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

  topBar: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    alignItems: "center",
    marginBottom: "12px",
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

  muted: {
    fontSize: "13px",
    opacity: 0.65,
    margin: "6px 0",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  reportCard: {
    border: "1px solid #eee",
    borderRadius: "14px",
    padding: "12px",
    background: "#fafafa",
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
  },

  postText: {
    fontSize: "14px",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
  },

  postImage: {
    width: "100%",
    borderRadius: "12px",
    marginTop: "8px",
    border: "1px solid #eee",
  },

  actionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
  },

  dangerBtn: {
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  secondaryBtn: {
    border: "1px solid #ddd",
    borderRadius: "999px",
    background: "#fff",
    color: "#111",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
};