import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { isDemoUser } from "../utils/demoUser";
import { demoMembers } from "../utils/demoData";

const PAGE_SIZE = 10;

export default function CommunityAdminModerators() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [community, setCommunity] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("role");
  const [page, setPage] = useState(1);

  const canModerate = role === "admin" || role === "mod";

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

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

      const { data: communityData } = await supabase
        .from("communities")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

      setCommunity(communityData);

      if (isDemoUser(user)) {
        setMembers(demoMembers.filter((m) => m.role === "admin" || m.role === "mod"));
        setLoading(false);
        return;
      }

      const { data: memberData, error } = await supabase
        .from("memberships")
        .select("id, user_id, role, created_at")
        .eq("community_id", id)
        .in("role", ["admin", "mod"]);

      if (error) {
        console.error("LOAD MEMBERS ERROR:", error);
        setMembers([]);
        setLoading(false);
        return;
      }

      const memberIds = memberData?.map((m) => m.user_id) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", memberIds);

      const profileMap = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });

      setMembers(
        (memberData || []).map((m) => ({
          ...m,
          profile: profileMap[m.user_id] || null,
        }))
      );

      setLoading(false);
    };

    load();
  }, [id, navigate]);

  const filtered = useMemo(() => {
    const clean = search.trim().toLowerCase();

    let list = members.filter((m) => {
      const username = m.profile?.username || "";
      return username.toLowerCase().includes(clean);
    });

    if (sort === "username") {
      list.sort((a, b) =>
        (a.profile?.username || "").localeCompare(
          b.profile?.username || ""
        )
      );
    }

    if (sort === "role") {
      list.sort((a, b) => {
        const order = { admin: 0, mod: 1, member: 2 };
        return order[a.role] - order[b.role];
      });
    }

    if (sort === "newest") {
      list.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return list;
  }, [members, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const changeRole = async (membershipId, nextRole) => {
    if (role !== "admin") return;

    const { data } = await supabase.auth.getUser();

    if (isDemoUser(data?.user)) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === membershipId ? { ...m, role: nextRole } : m
        )
      );

      alert("Demo preview: moderator role changed.");
      return;
    }

    const { error } = await supabase
      .from("memberships")
      .update({ role: nextRole })
      .eq("id", membershipId);

    if (error) {
      alert("Could not update role.");
      return;
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === membershipId ? { ...m, role: nextRole } : m
      )
    );
  };

  const removeMember = async (membershipId) => {
    if (!canModerate) return;

    const { data } = await supabase.auth.getUser();

    if (isDemoUser(data?.user)) {
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
      alert("Demo preview: moderator removed.");
      return;
    }

    const confirmRemove = window.confirm(
      "Remove this member from the community?"
    );

    if (!confirmRemove) return;

    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("id", membershipId);

    if (error) {
      alert("Could not remove member.");
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== membershipId));
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button
          type="button"
          onClick={() => navigate(`/c/${id}/admin`)}
          style={styles.backBtn}
          title="Back to Admin"
        >
          ←
        </button>

        <h2 style={styles.title}>Moderators</h2>
      </div>

      <p style={styles.subtitle}>{community?.name || "Community"}</p>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search members"
        style={styles.input}
      />

      <select
        value={sort}
        onChange={(e) => {
          setSort(e.target.value);
          setPage(1);
        }}
        style={styles.select}
      >
        <option value="role">Sort by role</option>
        <option value="username">Sort by username</option>
        <option value="newest">Sort by newest</option>
      </select>

      {loading && <p style={styles.muted}>Loading members...</p>}

      {!loading && paginated.length === 0 && (
        <p style={styles.muted}>No moderators found.</p>
      )}

      <div style={styles.list}>
        {paginated.map((member) => (
          <div key={member.id} style={styles.row}>
            <div style={styles.userRow}>
              <img
                src={
                  member.profile?.avatar_url ||
                  "/default-avatar.png"
                }
                alt="member"
                style={styles.avatar}
              />

              <div style={styles.info}>
                <div style={styles.nameLine}>
                  <strong>@{member.profile?.username || "user"}</strong>

                  {member.role === "admin" && (
                    <span style={styles.admin}>Admin</span>
                  )}

                  {member.role === "mod" && (
                    <span style={styles.mod}>Mod</span>
                  )}

                  {member.role === "member" && (
                    <span style={styles.member}>Member</span>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.memberActions}>
              {role === "admin" && member.role === "member" && (
                <button
                  type="button"
                  onClick={() => changeRole(member.id, "mod")}
                  style={styles.promoteBtn}
                >
                  Make mod
                </button>
              )}

              {role === "admin" && member.role === "mod" && (
                <button
                  type="button"
                  onClick={() => changeRole(member.id, "member")}
                  style={styles.secondaryBtn}
                >
                  Remove mod
                </button>
              )}

              {canModerate && member.role !== "admin" && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            style={styles.pageBtn}
          >
            Previous
          </button>

          <span style={styles.pageText}>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() =>
              setPage((p) => Math.min(p + 1, totalPages))
            }
            disabled={page === totalPages}
            style={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "80vh",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: "4px",
  },

  backBtn: {
    position: "absolute",
    left: 0,
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

  subtitle: {
    textAlign: "center",
    fontSize: "13px",
    opacity: 0.6,
    marginTop: "4px",
    marginBottom: "14px",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "999px",
    border: "1px solid #ddd",
    marginBottom: "10px",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #ddd",
    marginBottom: "12px",
    boxSizing: "border-box",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #eee",
    background: "#fff",
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
  },

  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
    flexShrink: 0,
  },

  info: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 0,
  },

  nameLine: {
    display: "flex",
    alignItems: "center",
    gap: "0px",
    flexWrap: "wrap",
    fontSize: "13px",
    minWidth: 0,
  },

  memberActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },

  promoteBtn: {
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  secondaryBtn: {
    border: "1px solid #ddd",
    borderRadius: "999px",
    background: "#fff",
    color: "#111",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  removeBtn: {
    border: "1px solid #ddd",
    borderRadius: "999px",
    background: "#fff",
    color: "#b00020",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  admin: {
    fontSize: "10px",
    lineHeight: 1,
    background: "#34444f",
    color: "#fff",
    padding: "3px 6px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "6px",
    fontWeight: "700",
    verticalAlign: "middle",
  },

  mod: {
    fontSize: "10px",
    lineHeight: 1,
    background: "#34444f",
    color: "#fff",
    padding: "3px 6px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "6px",
    fontWeight: "700",
    verticalAlign: "middle",
  },

  member: {
    fontSize: "10px",
    lineHeight: 1,
    background: "#e7e7e8",
    color: "#555",
    padding: "3px 6px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "6px",
    fontWeight: "700",
    verticalAlign: "middle",
  },

  muted: {
    fontSize: "13px",
    opacity: 0.6,
    textAlign: "center",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginTop: "16px",
  },

  pageBtn: {
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "7px 12px",
    cursor: "pointer",
  },

  pageText: {
    fontSize: "13px",
    opacity: 0.7,
  },
};