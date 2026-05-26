import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function CommunityAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState(null);
  const [community, setCommunity] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [membershipType, setMembershipType] = useState("open");

  const [approvalType, setApprovalType] = useState("question");
  const [approvalQuestion, setApprovalQuestion] = useState("");
  const [approvalChoices, setApprovalChoices] = useState(["", "", "", ""]);
  const [approvalCorrectAnswer, setApprovalCorrectAnswer] = useState("");

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerX, setBannerX] = useState(0);
  const [bannerY, setBannerY] = useState(0);

  const [previewMembers, setPreviewMembers] = useState([]);
  const [previewMods, setPreviewMods] = useState([]);

  const canEditCommunity = role === "admin";

  const cleanChoices = approvalChoices
    .map((choice) => choice.trim())
    .filter(Boolean);

  const approvalIsValid =
    membershipType !== "restricted" ||
    approvalQuestion.trim().length > 0;

  const quizIsValid =
    approvalType !== "quiz" ||
    (cleanChoices.length >= 2 && approvalCorrectAnswer);

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
        .select(
          "id, name, description, banner_url, membership_type, approval_type, approval_question, approval_choices, approval_correct_answer, rules, created_at, created_by"
        )
        .eq("id", id)
        .maybeSingle();

      setCommunity(communityData);
      setName(communityData?.name || "");
      setDescription(communityData?.description || "");
      setRules(communityData?.rules || "");
      setMembershipType(communityData?.membership_type || "open");
      setApprovalType(communityData?.approval_type || "question");
      setApprovalQuestion(communityData?.approval_question || "");
      setApprovalChoices(
        Array.isArray(communityData?.approval_choices) &&
          communityData.approval_choices.length > 0
          ? [
              ...communityData.approval_choices,
              "",
              "",
              "",
              "",
            ].slice(0, 4)
          : ["", "", "", ""]
      );
      setApprovalCorrectAnswer(communityData?.approval_correct_answer || "");
      setBannerPreview(communityData?.banner_url || null);

      const { data: previewData } = await supabase
        .from("memberships")
        .select("id, user_id, role")
        .eq("community_id", id)
        .order("role", { ascending: true })
        .limit(8);

      if (previewData?.length) {
        const userIds = previewData.map((m) => m.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = {};
        (profiles || []).forEach((p) => {
          profileMap[p.id] = p;
        });

        const withProfiles = previewData.map((m) => ({
          ...m,
          profile: profileMap[m.user_id] || null,
        }));

        setPreviewMods(
          withProfiles.filter(
            (m) => m.role === "admin" || m.role === "mod"
          )
        );

        setPreviewMembers(withProfiles);
      } else {
        setPreviewMods([]);
        setPreviewMembers([]);
      }

      setLoading(false);
    };

    load();
  }, [id, navigate]);

  const createCroppedBannerBlob = () => {
    return new Promise((resolve, reject) => {
      if (!bannerFile) {
        resolve(null);
        return;
      }

      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const width = 1200;
        const height = 300;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f6f6f6";
        ctx.fillRect(0, 0, width, height);

        const baseScale = Math.max(width / img.width, height / img.height);
        const scale = baseScale * bannerZoom;

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;

        const x = (width - drawWidth) / 2 + bannerX * 4;
        const y = (height - drawHeight) / 2 + bannerY * 4;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not crop banner."));
              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          0.9
        );
      };

      img.onerror = () => reject(new Error("Could not load banner image."));
      img.src = URL.createObjectURL(bannerFile);
    });
  };

  const uploadBanner = async () => {
    if (!bannerFile) return community?.banner_url || null;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return null;

    if (bannerFile.size > 5 * 1024 * 1024) {
  throw new Error("Banner must be under 5MB");
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(bannerFile.type)) {
      throw new Error(
        "Only JPG, PNG, and WebP images are allowed"
      );
    }

    const croppedBlob = await createCroppedBannerBlob();

    const fileName = `${user.id}-${Date.now()}.jpg`;
    const filePath = `community-banners/${fileName}`;

    const { error } = await supabase.storage
      .from("post-images")
      .upload(filePath, croppedBlob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveCommunity = async () => {
    if (!canEditCommunity) return;
    if (!name.trim()) return;

    if (!approvalIsValid || !quizIsValid) {
      alert("Please complete the restricted approval fields.");
      return;
    }

    setSaving(true);

    try {
      const bannerUrl = await uploadBanner();

      const { error } = await supabase
        .from("communities")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          rules: rules.trim() || null,
          membership_type: membershipType,
          approval_type:
            membershipType === "restricted" ? approvalType : null,
          approval_question:
            membershipType === "restricted"
              ? approvalQuestion.trim() || null
              : null,
          approval_choices:
            membershipType === "restricted" && approvalType === "quiz"
              ? cleanChoices
              : [],
          approval_correct_answer:
            membershipType === "restricted" && approvalType === "quiz"
              ? approvalCorrectAnswer
              : null,
          banner_url: bannerUrl,
        })
        .eq("id", id);

      if (error) throw error;

      alert("Community updated.");
      setBannerFile(null);

      setCommunity((prev) => ({
        ...prev,
        name: name.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        membership_type: membershipType,
        approval_type:
          membershipType === "restricted" ? approvalType : null,
        approval_question:
          membershipType === "restricted"
            ? approvalQuestion.trim() || null
            : null,
        approval_choices:
          membershipType === "restricted" && approvalType === "quiz"
            ? cleanChoices
            : [],
        approval_correct_answer:
          membershipType === "restricted" && approvalType === "quiz"
            ? approvalCorrectAnswer
            : null,
        banner_url: bannerUrl,
      }));

      setBannerPreview(bannerUrl);
    } catch (err) {
      console.error("SAVE COMMUNITY ERROR:", err);
      alert(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCommunity = async () => {
  if (role !== "admin") return;

  const confirmed = window.confirm(
    "Delete this community? This will permanently delete the community, posts, comments, memberships, join requests, and related notifications."
  );

  if (!confirmed) return;

  const doubleConfirmed = window.confirm(
    "This cannot be undone. Are you absolutely sure?"
  );

  if (!doubleConfirmed) return;

  const { error } = await supabase
    .from("communities")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message || "Could not delete community.");
    return;
  }

  alert("Community deleted.");
  navigate("/communities");
};


  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Loading admin tools...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button
          type="button"
          onClick={() => navigate(`/c/${id}`)}
          style={styles.backBtn}
          title="Back to community"
        >
          ←
        </button>

        <h2 style={styles.title}>Admin tools</h2>

        <div />
      </div>

      <p style={styles.subtitle}>
        {community?.name || "Community"} · {role}
      </p>

      {canEditCommunity && (
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Community details</h3>

          <label style={styles.label}>Banner image</label>

          <label style={styles.bannerPicker}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;

                setBannerFile(file);
                setBannerPreview(file ? URL.createObjectURL(file) : null);
                setBannerZoom(1);
                setBannerX(0);
                setBannerY(0);
              }}
              style={styles.hiddenFile}
            />

            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="banner preview"
                style={{
                  ...styles.bannerPreview,
                  transform: `translate(${bannerX}px, ${bannerY}px) scale(${bannerZoom})`,
                }}
              />
            ) : (
              <div style={styles.bannerPlaceholder}>
                Choose banner
              </div>
            )}
          </label>

          {bannerPreview && (
            <>
              <label style={styles.smallLabel}>Zoom</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={bannerZoom}
                onChange={(e) => setBannerZoom(Number(e.target.value))}
                style={styles.slider}
              />

              <label style={styles.smallLabel}>Move left / right</label>
              <input
                type="range"
                min="-80"
                max="80"
                value={bannerX}
                onChange={(e) => setBannerX(Number(e.target.value))}
                style={styles.slider}
              />

              <label style={styles.smallLabel}>Move up / down</label>
              <input
                type="range"
                min="-60"
                max="60"
                value={bannerY}
                onChange={(e) => setBannerY(Number(e.target.value))}
                style={styles.slider}
              />
            </>
          )}

          <label style={styles.label}>Community name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="Community name"
          />

          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.textarea}
            placeholder="Description"
          />

          <label style={styles.label}>Rules</label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            style={styles.textarea}
            placeholder="Community rules"
          />

          <label style={styles.label}>Membership type</label>

          <div style={styles.membershipBox}>
            <button
              type="button"
              onClick={() => setMembershipType("open")}
              style={styles.membershipOption}
            >
              <div>
                <div style={styles.membershipTitle}>Open</div>
                <div style={styles.membershipDesc}>
                  Anyone can discover and join your community.
                </div>
              </div>

              <div style={styles.radioCircle}>
                {membershipType === "open" ? "✓" : ""}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMembershipType("restricted")}
              style={styles.membershipOption}
            >
              <div>
                <div style={styles.membershipTitle}>Restricted</div>
                <div style={styles.membershipDesc}>
                  People must ask to join, and the mod team must approve those requests.
                </div>
              </div>

              <div style={styles.radioCircle}>
                {membershipType === "restricted" ? "✓" : ""}
              </div>
            </button>
          </div>

          {membershipType === "restricted" && (
            <>
              <label style={styles.label}>Approval type</label>

              <div style={styles.membershipBox}>
                <button
                  type="button"
                  onClick={() => setApprovalType("question")}
                  style={styles.membershipOption}
                >
                  <div>
                    <div style={styles.membershipTitle}>Question</div>
                    <div style={styles.membershipDesc}>
                      People answer a short question before joining.
                    </div>
                  </div>

                  <div style={styles.radioCircle}>
                    {approvalType === "question" ? "✓" : ""}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalType("quiz")}
                  style={styles.membershipOption}
                >
                  <div>
                    <div style={styles.membershipTitle}>Quiz</div>
                    <div style={styles.membershipDesc}>
                      People choose from answer choices before joining.
                    </div>
                  </div>

                  <div style={styles.radioCircle}>
                    {approvalType === "quiz" ? "✓" : ""}
                  </div>
                </button>
              </div>

              <label style={styles.label}>
                {approvalType === "quiz"
                  ? "Approval quiz"
                  : "Approval question"}
              </label>

              <textarea
                placeholder={
                  approvalType === "quiz"
                    ? "Example: What is the secret word?"
                    : "Example: Why do you want to join this community?"
                }
                value={approvalQuestion}
                onChange={(e) => setApprovalQuestion(e.target.value)}
                style={styles.textarea}
              />

              {approvalType === "quiz" && (
                <>
                  <label style={styles.label}>Answer choices</label>

                  {approvalChoices.map((choice, index) => (
                    <input
                      key={index}
                      placeholder={`Choice ${index + 1}`}
                      value={choice}
                      onChange={(e) => {
                        const updated = [...approvalChoices];
                        updated[index] = e.target.value;
                        setApprovalChoices(updated);

                        if (approvalCorrectAnswer === choice) {
                          setApprovalCorrectAnswer("");
                        }
                      }}
                      style={styles.input}
                    />
                  ))}

                  <label style={styles.label}>Correct answer</label>

                  <select
                    value={approvalCorrectAnswer}
                    onChange={(e) =>
                      setApprovalCorrectAnswer(e.target.value)
                    }
                    style={styles.select}
                  >
                    <option value="">Select correct answer</option>

                    {approvalChoices.map((choice, index) => {
                      const cleanChoice = choice.trim();

                      if (!cleanChoice) return null;

                      return (
                        <option key={index} value={cleanChoice}>
                          {cleanChoice}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}
            </>
          )}

          <button
            type="button"
            onClick={saveCommunity}
            disabled={
              saving ||
              !name.trim() ||
              !approvalIsValid ||
              !quizIsValid
            }
            style={{
              ...styles.saveBtn,
              opacity:
                saving ||
                !name.trim() ||
                !approvalIsValid ||
                !quizIsValid
                  ? 0.6
                  : 1,
            }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}

      <div
        style={styles.membersLinkCard}
        onClick={() => navigate(`/c/${id}/admin/reports`)}
      >
        <div>
          <h3 style={styles.sectionTitle}>Reported posts</h3>

          <p style={styles.muted}>
            Review, hide, or clear reported posts
          </p>
        </div>

        <span style={styles.arrow}>›</span>
      </div>

      <div
  style={styles.membersLinkCard}
  onClick={() => navigate(`/c/${id}/admin/requests`)}
>
  <div>
    <h3 style={styles.sectionTitle}>Join requests</h3>

    <p style={styles.muted}>
      Approve or deny pending member requests
    </p>
  </div>

  <span style={styles.arrow}>›</span>
</div>

{role === "admin" && (
  <div
    style={styles.membersLinkCard}
    onClick={() => navigate(`/c/${id}/admin/transfer`)}
  >
    <div>
      <h3 style={styles.sectionTitle}>Transfer ownership</h3>

      <p style={styles.muted}>
        Make another member an admin before deleting your account
      </p>
    </div>

    <span style={styles.arrow}>›</span>
  </div>
)}


      <div
        style={styles.membersLinkCard}
        onClick={() => navigate(`/c/${id}/admin/moderators`)}
      >
        <div style={styles.previewContent}>
          <h3 style={styles.sectionTitle}>Moderators</h3>

          {previewMods.length === 0 ? (
            <p style={styles.muted}>No moderators yet</p>
          ) : (
            previewMods.slice(0, 3).map((mod) => (
              <div key={mod.id} style={styles.previewRow}>
                <strong>@{mod.profile?.username || "user"}</strong>

                {mod.role === "admin" && (
                  <span style={styles.adminTag}>Admin</span>
                )}

                {mod.role === "mod" && (
                  <span style={styles.modTag}>Mod</span>
                )}
              </div>
            ))
          )}
        </div>

        <span style={styles.arrow}>›</span>
      </div>

      <div
        style={styles.membersLinkCard}
        onClick={() => navigate(`/c/${id}/admin/members`)}
      >
        <div style={styles.previewContent}>
          <h3 style={styles.sectionTitle}>Members</h3>

          {previewMembers.length === 0 ? (
            <p style={styles.muted}>No members yet</p>
          ) : (
            previewMembers.slice(0, 3).map((member) => (
              <div key={member.id} style={styles.previewRow}>
                <strong>@{member.profile?.username || "user"}</strong>

                {member.role === "admin" && (
                  <span style={styles.adminTag}>Admin</span>
                )}

                {member.role === "mod" && (
                  <span style={styles.modTag}>Mod</span>
                )}

                {member.role === "member" && (
                  <span style={styles.memberTag}>Member</span>
                )}
              </div>
            ))
          )}
        </div>

        <span style={styles.arrow}>›</span>
      </div>
      {role === "admin" && (
        <button
          type="button"
          onClick={deleteCommunity}
          style={styles.deleteCommunityBtn}
        >
          Delete community
        </button>
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

  topBar: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    alignItems: "center",
    marginBottom: "4px",
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

  subtitle: {
    textAlign: "center",
    fontSize: "13px",
    opacity: 0.6,
    marginTop: "4px",
    marginBottom: "16px",
  },

  card: {
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #eee",
    background: "#fff",
    marginBottom: "12px",
    textAlign: "left",
  },

  sectionTitle: {
    fontSize: "15px",
    margin: "0 0 8px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "6px",
  },

  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "12px",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    boxSizing: "border-box",
  },

  hiddenFile: {
    display: "none",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "12px",
    boxSizing: "border-box",
    resize: "vertical",
  },

  saveBtn: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  muted: {
    fontSize: "13px",
    opacity: 0.65,
    margin: "6px 0",
  },

  membersLinkCard: {
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #eee",
    background: "#fff",
    marginBottom: "12px",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    gap: "12px",
  },

  previewContent: {
    width: "100%",
  },

  previewRow: {
    display: "flex",
    alignItems: "center",
    gap: "0px",
    flexWrap: "wrap",
    fontSize: "13px",
    marginTop: "8px",
  },

  arrow: {
    fontSize: "28px",
    color: "#111",
    lineHeight: 1,
    flexShrink: 0,
  },

  bannerPicker: {
    width: "100%",
    height: "150px",
    borderRadius: "14px",
    border: "1px dashed #bbb",
    background: "#f6f6f6",
    overflow: "hidden",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    cursor: "pointer",
  },

  bannerPreview: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transition: "transform 0.1s ease",
  },

  bannerPlaceholder: {
    fontSize: "14px",
    opacity: 0.6,
  },

  smallLabel: {
    display: "block",
    fontSize: "12px",
    opacity: 0.7,
    marginBottom: "4px",
  },

  slider: {
    width: "100%",
    marginBottom: "10px",
  },

  membershipBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "12px",
  },

  membershipOption: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "8px 0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    textAlign: "left",
  },

  membershipTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#56566f",
    marginBottom: "2px",
  },

  membershipDesc: {
    fontSize: "12px",
    color: "#666",
    lineHeight: 1.35,
  },

  radioCircle: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "2px solid #7c7c8a",
    color: "#56566f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    flexShrink: 0,
  },

  adminTag: {
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
  },

  modTag: {
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
  },

  memberTag: {
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
  },

  deleteCommunityBtn: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#d93025",
    color: "#fff",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "700",
    marginTop: "4px",
    marginBottom: "20px",
  },
};