import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function CommunityAdminJoinRequests() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [community, setCommunity] = useState(null);

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

      const { data: communityData } = await supabase
        .from("communities")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

      setCommunity(communityData);

      const { data: requestData, error } = await supabase
        .from("community_join_requests")
        .select("id, user_id, status, answer_text, selected_answer, created_at")
        .eq("community_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD JOIN REQUESTS ERROR:", error);
        setRequests([]);
        setLoading(false);
        return;
      }

      const userIds = requestData?.map((r) => r.user_id) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });

      setRequests(
        (requestData || []).map((r) => ({
          ...r,
          profile: profileMap[r.user_id] || null,
        }))
      );

      setLoading(false);
    };

    load();
  }, [id, navigate]);

  const approveRequest = async (request) => {
    const { error: memberError } = await supabase
      .from("memberships")
      .upsert({
        community_id: id,
        user_id: request.user_id,
        role: "member",
      });

    if (memberError) {
      alert(memberError.message || "Could not approve request.");
      return;
    }

    const { error: updateError } = await supabase
      .from("community_join_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (updateError) {
      alert(updateError.message || "Approved, but could not update request.");
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== request.id));
  };

  const denyRequest = async (requestId) => {
    const { error } = await supabase
      .from("community_join_requests")
      .update({ status: "denied" })
      .eq("id", requestId);

    if (error) {
      alert(error.message || "Could not deny request.");
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button
          type="button"
          onClick={() => navigate(`/c/${id}/admin`)}
          style={styles.backBtn}
        >
          ←
        </button>

        <h2 style={styles.title}>Join requests</h2>
      </div>

      <p style={styles.subtitle}>{community?.name || "Community"}</p>

      {loading && <p style={styles.muted}>Loading requests...</p>}

      {!loading && requests.length === 0 && (
        <p style={styles.muted}>No pending join requests.</p>
      )}

      <div style={styles.list}>
        {requests.map((request) => (
          <div key={request.id} style={styles.card}>
            <div style={styles.userRow}>
              <img
                src={
                  request.profile?.avatar_url ||
                  "/default-avatar.png"
                }
                alt="user"
                style={styles.avatar}
              />

              <strong>@{request.profile?.username || "user"}</strong>
            </div>

            <div style={styles.answerBox}>
              <div style={styles.answerLabel}>Answer</div>
              <div style={styles.answerText}>
                {request.answer_text ||
                  request.selected_answer ||
                  "No answer provided"}
              </div>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => approveRequest(request)}
                style={styles.approveBtn}
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => denyRequest(request.id)}
                style={styles.denyBtn}
              >
                Deny
              </button>
            </div>
          </div>
        ))}
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

  muted: {
    fontSize: "13px",
    opacity: 0.6,
    textAlign: "center",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  card: {
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid #eee",
    background: "#fff",
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
  },

  answerBox: {
    padding: "10px",
    borderRadius: "12px",
    background: "#fafafa",
    border: "1px solid #eee",
    marginBottom: "10px",
  },

  answerLabel: {
    fontSize: "12px",
    opacity: 0.6,
    marginBottom: "4px",
  },

  answerText: {
    fontSize: "14px",
    lineHeight: 1.4,
  },

  actions: {
    display: "flex",
    gap: "8px",
  },

  approveBtn: {
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  denyBtn: {
    border: "1px solid #ddd",
    borderRadius: "999px",
    background: "#fff",
    color: "#b00020",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
};