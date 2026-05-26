import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Discover() {
  const navigate = useNavigate();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  /* ⏱️ debounce search (prevents too many Supabase calls) */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

/* 🔍 FETCH COMMUNITIES (with search) */
useEffect(() => {
  const load = async () => {
    const cleanSearch = debouncedSearch.trim().toLowerCase();

    // ✅ Empty search → original Discover page
    if (!cleanSearch) {
      setCommunities([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("communities")
      .select(`
        id,
        name,
        description,
        created_at,
        created_by,
        member_count,
        banner_url
      `)
      .ilike("name", `%${cleanSearch}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Discover fetch error:", error);
      setCommunities([]);
    } else {
      setCommunities(data || []);
    }

    setLoading(false);
  };

  load();
}, [debouncedSearch]);

  return (
    <div style={styles.container}>

      {/* 🔍 SEARCH BAR */}
      <div style={styles.searchWrap}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          style={styles.searchInput}
        />
      </div>

      {/* 🧠 LOADING STATE */}
      {loading && (
        <p style={styles.muted}>Loading communities...</p>
      )}

      {/* 📭 EMPTY STATE (no communities at all) */}
      {!loading && communities.length === 0 && !search && (
        <div style={styles.empty}>
          <h3 style={styles.emptyTitle}>
            Discover Communities
          </h3>
          <p style={styles.muted}>
            Find and join communities based on your interests.
          </p>
        </div>
      )}

      {/* ❌ NO RESULTS STATE (search gave nothing) */}
      {!loading && communities.length === 0 && search && (
        <div style={styles.empty}>
          <h3 style={styles.emptyTitle}>
            No results found
          </h3>
          <p style={styles.muted}>
            Try searching for something else.
          </p>
        </div>
      )}

      {/* 🧭 COMMUNITY LIST */}
      {!loading && communities.length > 0 && (
        <div style={styles.list}>
          {communities.map((c) => (
            <div
  key={c.id}
  style={styles.card}
  onClick={() => navigate(`/c/${c.id}`)}
>
  <div style={styles.cardInner}>
    <div
  style={{
    ...styles.avatar,
    background: c.banner_url
      ? `url(${c.banner_url}) center / cover`
      : "linear-gradient(135deg, #7ab6ff, #5f7cff)",
  }}
/>

    <div style={styles.textContent}>
      <div style={styles.name}>{c.name}</div>

      <div style={styles.memberCount}>
        👥 {c.member_count || 0} members
      </div>

      <div style={styles.desc}>
        {c.description || "No description"}
      </div>
    </div>
  </div>
</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "12px 16px",
  },

  /* 🔍 SEARCH */
  searchWrap: {
    marginBottom: "12px",
  },

  searchInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "999px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none",
  },

  /* 📭 EMPTY STATES */
  empty: {
    marginTop: "40px",
    textAlign: "center",
  },

  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "6px",
  },

  muted: {
    fontSize: "13px",
    opacity: 0.6,
  },

  /* 🧭 LIST */
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  card: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #eee",
    cursor: "pointer",
    background: "#fff",
  },

  cardInner:{
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

  memberCount: {
    fontSize: "12px",
    opacity: 0.6,
    marginTop: "2px",
  },

  name: {
    fontSize: "15px",
    fontWeight: "600",
  },

  desc: {
    fontSize: "13px",
    opacity: 0.7,
    marginTop: "3px",
  },
};