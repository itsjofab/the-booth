import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadJoinedCommunities = async () => {
      setLoading(true);

      // 👤 Get current user
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setCommunities([]);
        setLoading(false);
        return;
      }

      // 🧩 STEP 1: Get joined community IDs
      const { data: memberships, error: memError } = await supabase
        .from("memberships")
        .select("community_id")
        .eq("user_id", user.id);

      if (memError) {
        console.error("Membership fetch error:", memError);
        setCommunities([]);
        setLoading(false);
        return;
      }

      const communityIds = memberships?.map((m) => m.community_id) || [];

      // 🚨 If user joined none
      if (communityIds.length === 0) {
        setCommunities([]);
        setLoading(false);
        return;
      }

      // 🧠 STEP 2: Fetch only joined communities
      const { data, error } = await supabase
        .from("communities")
        .select(`
  id,
  name,
  description,
  banner_url,
  member_count,
  created_at,
  created_by
`)
        .in("id", communityIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
        setCommunities([]);
        setLoading(false);
        return;
      }

      setCommunities(data || []);
      setLoading(false);
    };

    loadJoinedCommunities();
  }, []);

  return (
    <div style={styles.container}>

{/* 🧭 HEADER */}
<div className="communities-header" style={styles.header}>
  <div className="communities-header-text">
    <h2 style={styles.title}>🏘️ Your Communities</h2>
    <p style={styles.subtitle}>
      Only communities you’ve joined
    </p>
  </div>

  <button
    className="communities-create-button"
    style={styles.createButton}
    onClick={() => navigate("/communities/new")}
  >
    ➕ Create
  </button>
</div>

      {/* ⏳ LOADING */}
      {loading && (
        <p style={styles.muted}>Loading your communities...</p>
      )}

      {/* 📭 EMPTY STATE */}
      {!loading && communities.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No communities yet</div>
          <div style={styles.muted}>
            Join communities to see them here.
          </div>
        </div>
      )}

      {/* 🧩 LIST */}
      <div style={styles.list}>
        {communities.map((community) => (
        <Link
  key={community.id}
  to={`/c/${community.id}`}
  style={styles.card}
>
  <div style={styles.cardInner}>
    <div
      style={{
        ...styles.avatar,
        background: community.banner_url
          ? `url(${community.banner_url}) center / cover`
          : "linear-gradient(135deg, #7ab6ff, #5f7cff)",
      }}
    />

    <div style={styles.textContent}>
      <div style={styles.name}>{community.name}</div>

      <div style={styles.memberCount}>
        👥 {community.member_count || 0} members
      </div>

      <div style={styles.desc}>
        {community.description || "No description"}
      </div>
    </div>
  </div>
</Link>
        ))}
      </div>
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
  },

  header: {
    position: "relative",
    marginBottom: "16px",
    textAlign: "center",
  },

  title: {
    margin: 0,
  },

  subtitle: {
    fontSize: "13px",
    opacity: 0.6,
    marginTop: "4px",
  },

  createButton: {
    position: "absolute",
    top: "0",
    right: "0",
    padding: "5px 8px",
    borderRadius: "999px",
    border: "1px solid #ddd",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "400",
    whiteSpace: "nowrap",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  card: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #eee",
    background: "#fff",
    textDecoration: "none",
    color: "inherit",
  },

  cardInner: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  avatar: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    flexShrink: 0,
    background: "linear-gradient(135deg, #7ab6ff, #5f7cff)",
  },

  textContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
    minWidth: 0,
  },

  name: {
    fontWeight: "600",
    fontSize: "15px",
  },

  memberCount: {
    fontSize: "12px",
    opacity: 0.6,
    marginTop: "2px",
  },

  desc: {
    fontSize: "13px",
    opacity: 0.7,
    marginTop: "3px",
  },

  empty: {
    textAlign: "center",
    marginTop: "30px",
  },

  emptyTitle: {
    fontWeight: "600",
    marginBottom: "6px",
  },

  muted: {
    fontSize: "14px",
    opacity: 0.6,
  },
};