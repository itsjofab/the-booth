import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import CreatePost from "../components/CreatePost";
import { attachPostProfiles } from "../utils/attachPostProfiles";
import { getCommunityBanner } from "../utils/uiDefaults";
import { uploadArchiveImage } from "../utils/uploadArchiveImage";

function RoleBadge({ role }) {
  if (role === "admin") return <span style={styles.admin}>Admin</span>;
  if (role === "mod") return <span style={styles.mod}>Mod</span>;
  return null;
}

export default function CommunityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = location.state?.tab || "posts";

  const [members, setMembers] = useState([]);
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);

  const [tab, setTab] = useState(initialTab);

  const [createOpen, setCreateOpen] = useState(false);
  const [role, setRole] = useState("member");
  const [memberCount, setMemberCount] = useState(0);
  const [mods, setMods] = useState([]);
  const [archives, setArchives] = useState([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTitle, setArchiveTitle] = useState("");
  const [archiveUrl, setArchiveUrl] = useState("");
  const [archiveDescription, setArchiveDescription] = useState("");
  const [archiveImageFile, setArchiveImageFile] = useState(null);
  const [archiveSaving, setArchiveSaving] = useState(false);

  const [joinRequestOpen, setJoinRequestOpen] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);

  const isRestricted = community?.membership_type === "restricted";
  const approvalType = community?.approval_type || "question";
  const approvalChoices = Array.isArray(community?.approval_choices)
    ? community.approval_choices
    : [];

  const joinButtonText = isMember
  ? "Joined"
  : joinRequestStatus === "pending"
  ? "Cancel request"
  : isRestricted
  ? "Request to join"
  : "Join";

  const requestCanSubmit =
    approvalType === "quiz"
      ? !!selectedAnswer
      : answerText.trim().length > 0;

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };

    getUser();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadCommunity = async () => {
      setLoading(true);

      const { data: communityData, error: communityError } = await supabase
        .from("communities")
        .select(`
          id,
          name,
          description,
          banner_url,
          created_at,
          created_by,
          membership_type,
          approval_type,
          approval_question,
          approval_choices,
          approval_correct_answer
        `)
        .eq("id", id)
        .maybeSingle();

      if (communityError) {
        console.error("COMMUNITY LOAD ERROR:", communityError);
      }

      setCommunity(communityData);

      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id,
          community_id,
          user_id,
          content,
          image_url,
          media_url,
          media_type,
          gif_url,
          likes_count,
          is_hidden,
          is_reported,
          created_at
        `)
        .eq("is_hidden", false)
        .eq("community_id", id)
        .order("created_at", { ascending: false });

      const postsWithProfiles = await attachPostProfiles(postsData || []);
      setPosts(postsWithProfiles);

      if (isActive) {
        setLoading(false);
      }

      const { count } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("community_id", id);

      setMemberCount(count || 0);

      const { data: modData } = await supabase
        .from("memberships")
        .select("id, user_id, role")
        .eq("community_id", id)
        .in("role", ["admin", "mod"]);

      if (modData?.length) {
        const userIds = modData.map((m) => m.user_id);

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = {};
        (profilesData || []).forEach((p) => {
          profileMap[p.id] = p;
        });

        setMods(
          modData.map((m) => ({
            ...m,
            profile: profileMap[m.user_id] || null,
          }))
        );
      } else {
        setMods([]);
      }

      const { data: memberData } = await supabase
        .from("memberships")
        .select("id, user_id, role")
        .eq("community_id", id)
        .limit(5);

      if (memberData?.length) {
        const memberUserIds = memberData.map((m) => m.user_id);

        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", memberUserIds);

        const memberProfileMap = {};
        (memberProfiles || []).forEach((p) => {
          memberProfileMap[p.id] = p;
        });

        setMembers(
          memberData.map((m) => ({
            ...m,
            profile: memberProfileMap[m.user_id] || null,
          }))
        );
      } else {
        setMembers([]);
      }

      const { data: archiveData, error: archiveError } = await supabase
        .from("community_archives")
        .select(`
          id,
          community_id,
          user_id,
          title,
          description,
          twitter_url,
          image_url,
          created_at
        `)
        .eq("community_id", id)
        .order("created_at", { ascending: false });

      if (archiveError) {
        console.error("ARCHIVE LOAD ERROR:", archiveError);
        setArchives([]);
      } else {
        setArchives(archiveData || []);
      }
      
    };

    loadCommunity();

    return () => {
      isActive = false;
    };
  }, [id]);
  
  useEffect(() => {
    if (!userId) return;

    const checkMembership = async () => {
      const { data } = await supabase
        .from("memberships")
        .select("id, user_id, community_id, role")
        .eq("user_id", userId)
        .eq("community_id", id)
        .maybeSingle();

      setIsMember(!!data);
      setRole(data?.role || "member");

      const { data: requestData } = await supabase
        .from("community_join_requests")
        .select("id, status")
        .eq("user_id", userId)
        .eq("community_id", id)
        .eq("status", "pending")
        .maybeSingle();

      setJoinRequestStatus(requestData?.status || null);
    };

    checkMembership();
  }, [userId, id]);

  const cancelJoinRequest = async () => {
  if (!userId) return;

  setJoinLoading(true);

  const { error } = await supabase
    .from("community_join_requests")
    .delete()
    .eq("community_id", id)
    .eq("user_id", userId);

  if (error) {
    alert(error.message || "Could not cancel request.");
    setJoinLoading(false);
    return;
  }

  setJoinRequestStatus(null);
  setJoinLoading(false);
};


const toggleMembership = async () => {
  if (!userId) {
    navigate("/login");
    return;
  }

  if (!isMember && joinRequestStatus === "pending") {
    await cancelJoinRequest();
    return;
  }

  if (!isMember && isRestricted) {
    setJoinRequestOpen(true);
    return;
  }

  const next = !isMember;

  setIsMember(next);
  setJoinLoading(true);
  setMemberCount((prev) => (next ? prev + 1 : Math.max(prev - 1, 0)));

  try {
    if (next) {
      await supabase.from("memberships").insert({
        user_id: userId,
        community_id: id,
        role: "member",
      });

      setRole("member");
    } else {
      if (role === "admin") {
        const { count, error: adminCountError } = await supabase
          .from("memberships")
          .select("*", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("role", "admin");

        if (adminCountError) throw adminCountError;

        if ((count || 0) <= 1) {
          alert("Transfer ownership to another admin before leaving this community.");

          setIsMember(true);
          setMemberCount((prev) => prev + 1);
          setJoinLoading(false);
          return;
        }
      }

      await supabase
        .from("memberships")
        .delete()
        .eq("user_id", userId)
        .eq("community_id", id);

      setRole("member");
    }
  } catch {
    setIsMember((prev) => !prev);
    setMemberCount((prev) => (!next ? prev + 1 : Math.max(prev - 1, 0)));
  }

  setJoinLoading(false);
};

  const submitJoinRequest = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    if (!requestCanSubmit) return;

    setRequestSaving(true);

    try {
        const { data: joinRequestData, error } = await supabase
          .from("community_join_requests")
          .upsert(
          {
            community_id: id,
            user_id: userId,
            status: "pending",
            answer_text:
              approvalType === "question" ? answerText.trim() : null,
            selected_answer:
              approvalType === "quiz" ? selectedAnswer : null,
          },
          {
            onConflict: "community_id,user_id",
          }
        )
        .select("id")
        .single();

      if (error) throw error;

      const { data: adminRows, error: adminError } = await supabase
  .from("memberships")
  .select("user_id")
  .eq("community_id", id)
  .in("role", ["admin", "mod"]);

if (adminError) throw adminError;

const notificationRows = (adminRows || [])
  .filter((row) => row.user_id !== userId)
  .map((row) => ({
    recipient_id: row.user_id,
    community_id: id,
    related_join_request_id: joinRequestData?.id || null,
    type: "join_request",
    title: "New join request",
    message: `Someone requested to join ${community?.name || "your community"}.`,
    is_read: false,
  }));

if (notificationRows.length > 0) {
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert(notificationRows);

  if (notificationError) {
    console.error("JOIN REQUEST NOTIFICATION ERROR:", notificationError);
  }
}

      setJoinRequestStatus("pending");
      setJoinRequestOpen(false);
      setAnswerText("");
      setSelectedAnswer("");
    } catch (err) {
      console.error("JOIN REQUEST ERROR:", err);
      alert(err.message || "Could not submit join request.");
    } finally {
      setRequestSaving(false);
    }
  };

  const handleCreatePost = async (payload) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return;

    const tempPost = {
      id: `temp-${Date.now()}`,
      content: payload.content,
      image_url: payload.image_url,
      media_url: payload.media_url,
      media_type: payload.media_type,
      gif_url: payload.gif_url,
      community_id: id,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };

    const [tempPostWithProfile] = await attachPostProfiles([tempPost]);
    setPosts((prev) => [tempPostWithProfile, ...prev]);

    const { data } = await supabase
      .from("posts")
      .insert({
        content: payload.content,
        image_url: payload.image_url,
        media_url: payload.media_url,
        media_type: payload.media_type,
        gif_url: payload.gif_url,
        community_id: id,
        user_id: user.id,
      })
      .select()
      .single();

    if (data) {
      const [savedPostWithProfile] = await attachPostProfiles([data]);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === tempPost.id ? savedPostWithProfile : p
        )
      );
    }
  };

  const handleSaveArchive = async () => {
    if (!userId || !archiveTitle.trim()) return;

    setArchiveSaving(true);

    try {
      let imageUrl = null;

      if (archiveImageFile) {
        imageUrl = await uploadArchiveImage(archiveImageFile, userId);
      }

      const { data, error } = await supabase
        .from("community_archives")
        .insert({
          community_id: id,
          user_id: userId,
          title: archiveTitle.trim(),
          twitter_url: archiveUrl.trim() || null,
          description: archiveDescription.trim() || null,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setArchives((prev) => [data, ...prev]);
      setArchiveTitle("");
      setArchiveUrl("");
      setArchiveDescription("");
      setArchiveImageFile(null);
      setArchiveOpen(false);
    } catch (err) {
      console.error("SAVE ARCHIVE ERROR:", err);
      alert(err.message || "Could not save archive.");
    } finally {
      setArchiveSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  const bannerValue = getCommunityBanner(community);
  const bannerIsImage =
    typeof bannerValue === "string" && bannerValue.startsWith("http");

  const mediaPosts = posts.filter(
    (p) =>
      p.image_url ||
      p.gif_url ||
      p.media_url ||
      p.media_type?.startsWith("video")
  );

  const shareCommunity = async () => {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      alert("Community link copied!");
    } catch {
      alert(url);
    }
  };

  return (
    <div style={styles.container}>
      {bannerIsImage ? (
        <img
          src={bannerValue}
          alt="community banner"
          style={styles.bannerImage}
        />
      ) : (
        <div
          style={{
            ...styles.banner,
            background: bannerValue,
          }}
        >
          <div style={styles.bannerOverlay} />
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.headerText}>
          <h2 style={styles.title}>
            {community?.name || "Community"} <RoleBadge role={role} />
          </h2>

          <p style={styles.desc}>
            {community?.description || "No description yet"}
          </p>

          <p style={styles.memberText}>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>

        <div style={styles.headerActions}>
          {(role === "admin" || role === "mod") && (
            <button
              type="button"
              onClick={() => navigate(`/c/${id}/admin`)}
              style={styles.adminButton}
              title="Community settings"
            >
              ⚙️
            </button>
          )}

          <button style={styles.iconButton} title="Search">
            🔍
          </button>

          <button
            style={styles.iconButton}
            onClick={shareCommunity}
            title="Share"
          >
            📤
          </button>

          <button
            disabled={joinLoading || requestSaving}
            onClick={toggleMembership}
            style={{
              ...styles.button,
              background: isMember ? "#eee" : "#111",
              color: isMember ? "#000" : "#fff",
              opacity: joinLoading || requestSaving ? 0.7 : 1,
            }}
          >
            {joinLoading ? "Loading..." : joinButtonText}
          </button>
        </div>
      </div>

      <div style={styles.tabs}>
        {["posts", "media", "archive", "about"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tab,
              ...(tab === t ? styles.activeTab : {}),
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div style={styles.feed}>
          {posts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyTitle}>No posts yet</div>
              <div style={styles.emptyText}>
                Be the first to start a conversation in this community.
              </div>
            </div>
          ) : (
            posts
              .filter((p) => !String(p.id).startsWith("temp-"))
              .map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  userRole={role}
                  onDeleted={(postId) => {
                    setPosts((prev) => prev.filter((post) => post.id !== postId));
                  }}
                  onUpdated={(updatedPost) => {
                    setPosts((prev) =>
                      prev.map((post) =>
                        post.id === updatedPost.id
                          ? { ...post, ...updatedPost }
                          : post
                      )
                    );
                  }}
                />
              ))
          )}
        </div>
      )}

      {tab === "media" && (
        <div style={styles.feed}>
          {mediaPosts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyTitle}>No media yet</div>
              <div style={styles.emptyText}>
                Image, GIF, and video posts from this community will show here.
              </div>
            </div>
          ) : (
            mediaPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                userRole={role}
                onDeleted={(postId) => {
                  setPosts((prev) => prev.filter((post) => post.id !== postId));
                }}
                onUpdated={(updatedPost) => {
                  setPosts((prev) =>
                    prev.map((post) =>
                      post.id === updatedPost.id
                        ? { ...post, ...updatedPost }
                        : post
                    )
                  );
                }}
              />
            ))
          )}
        </div>
      )}

      {tab === "archive" && (
        <div style={styles.feed}>
          {isMember && (
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              style={styles.addArchiveBtn}
            >
              + Add
            </button>
          )}

          {archives.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyTitle}>No archive yet</div>
              <div style={styles.emptyText}>
                Link old Twitter/X posts, screenshots, or classic community moments here.
              </div>
            </div>
          ) : (
            archives.map((item) => (
              <div key={item.id} style={styles.archiveCard}>
                <div style={styles.archiveTitle}>{item.title}</div>

                {item.description && (
                  <div style={styles.archiveDesc}>{item.description}</div>
                )}

                {item.twitter_url && (
                  <a
                    href={item.twitter_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.archiveLink}
                  >
                    View Twitter/X post
                  </a>
                )}

                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt="archive"
                    style={styles.archiveImage}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "about" && (
        <div style={styles.about}>
          <h3 style={styles.aboutHeading}>Community Info</h3>

          <p style={styles.aboutText}>
            📌 {isRestricted ? "Membership requires approval" : "Anyone can join"}
          </p>

          <p style={styles.aboutText}>
            🌍 {isRestricted ? "Restricted community" : "Public community"}
          </p>

          <p style={styles.aboutText}>
            👥 {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>

          <p style={styles.aboutText}>
            📅 Created:{" "}
            {new Date(community?.created_at).toLocaleDateString()}
          </p>

          <hr style={styles.hr} />

          <h3 style={styles.aboutHeading}>Rules</h3>
          <p style={styles.muted}>No rules yet</p>

          <hr style={styles.hr} />

          <h3 style={styles.aboutHeading}>Moderators</h3>

          {mods.length === 0 ? (
            <p style={styles.muted}>No moderators yet</p>
          ) : (
            <>
              <div style={styles.modList}>
                {mods.slice(0, 3).map((mod) => (
                  <div key={mod.id} style={styles.modRow}>
                    <img
                      src={
                        mod.profile?.avatar_url ||
                        "/default-avatar.png"
                      }
                      alt="moderator"
                      style={styles.modAvatar}
                    />

                    <div style={styles.modInfo}>
                      <div style={styles.nameLine}>
                        <span style={styles.modName}>
                          @{mod.profile?.username || "user"}
                        </span>

                        {mod.role === "admin" && (
                          <span style={styles.adminMemberTag}>Admin</span>
                        )}

                        {mod.role === "mod" && (
                          <span style={styles.modMemberTag}>Mod</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(`/c/${id}/moderators`)}
                style={styles.showMoreBtn}
              >
                Show more
              </button>
            </>
          )}

          <hr style={styles.hr} />

          <h3 style={styles.aboutHeading}>Members</h3>

          {members.length === 0 ? (
            <p style={styles.muted}>No members yet</p>
          ) : (
            <>
              <div style={styles.modList}>
                {members.map((member) => (
                  <div key={member.id} style={styles.modRow}>
                    <img
                      src={
                        member.profile?.avatar_url ||
                        "/default-avatar.png"
                      }
                      alt="member"
                      style={styles.modAvatar}
                    />

                    <div style={styles.modInfo}>
                      <div style={styles.nameLine}>
                        <span style={styles.modName}>
                          @{member.profile?.username || "user"}
                        </span>

                        {member.role === "admin" && (
                          <span style={styles.adminMemberTag}>Admin</span>
                        )}

                        {member.role === "mod" && (
                          <span style={styles.modMemberTag}>Mod</span>
                        )}

                        {member.role === "member" && (
                          <span style={styles.memberTag}>Member</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(`/c/${id}/members`)}
                style={styles.showMoreBtn}
              >
                Show more
              </button>
            </>
          )}
        </div>
      )}

      {isMember && (
        <button
          onClick={() => setCreateOpen(true)}
          style={styles.floatingCreateBtn}
          title="Create post"
        >
          <span style={styles.postIcon}>+</span>
        </button>
      )}

      {joinRequestOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <button
                type="button"
                onClick={() => setJoinRequestOpen(false)}
                style={styles.backBtn}
              >
                ←
              </button>

              <div style={styles.modalTitle}>Request to join</div>
            </div>

            <p style={styles.requestQuestion}>
              {community?.approval_question ||
                "Answer this question to request access."}
            </p>

            {approvalType === "quiz" ? (
              <div style={styles.requestChoices}>
                {approvalChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setSelectedAnswer(choice)}
                    style={{
                      ...styles.requestChoiceBtn,
                      ...(selectedAnswer === choice
                        ? styles.requestChoiceActive
                        : {}),
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Write your answer..."
                style={styles.requestTextarea}
              />
            )}

            <button
              type="button"
              onClick={submitJoinRequest}
              disabled={requestSaving || !requestCanSubmit}
              style={{
                ...styles.saveArchiveBtn,
                opacity: requestSaving || !requestCanSubmit ? 0.6 : 1,
              }}
            >
              {requestSaving ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </div>
      )}

      {createOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <button
                onClick={() => setCreateOpen(false)}
                style={styles.backBtn}
                title="Back to community"
              >
                ←
              </button>

              <div style={styles.modalTitle}>Create a post</div>
            </div>

            <CreatePost
              onCreate={async (payload) => {
                await handleCreatePost(payload);
                setCreateOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {archiveOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                style={styles.backBtn}
              >
                ←
              </button>

              <div style={styles.modalTitle}>Add archive</div>
            </div>

            <input
              value={archiveTitle}
              onChange={(e) => setArchiveTitle(e.target.value)}
              placeholder="Archive title"
              style={styles.archiveInput}
            />

            <input
              value={archiveUrl}
              onChange={(e) => setArchiveUrl(e.target.value)}
              placeholder="Twitter/X link"
              style={styles.archiveInput}
            />

            <label style={styles.archiveUploadBox}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) =>
                  setArchiveImageFile(e.target.files?.[0] || null)
                }
                style={styles.hiddenArchiveFile}
              />

              <div style={styles.archiveUploadInner}>
                <div style={styles.archiveCameraIcon}>📷</div>
                <div style={styles.archiveUploadText}>Add screenshot</div>
              </div>
            </label>

            {archiveImageFile && (
              <div style={styles.archiveFileName}>
                Selected: {archiveImageFile.name}
              </div>
            )}

            <textarea
              value={archiveDescription}
              onChange={(e) => setArchiveDescription(e.target.value)}
              placeholder="Description"
              style={styles.archiveTextarea}
            />

            <button
              type="button"
              onClick={handleSaveArchive}
              disabled={archiveSaving || !archiveTitle.trim()}
              style={{
                ...styles.saveArchiveBtn,
                opacity: archiveSaving || !archiveTitle.trim() ? 0.6 : 1,
              }}
            >
              {archiveSaving ? "Saving..." : "Save"}
            </button>
          </div>
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

  banner: {
    height: "150px",
    borderRadius: "14px",
    marginBottom: "12px",
    position: "relative",
    overflow: "hidden",
  },

  bannerImage: {
    width: "100%",
    height: "150px",
    objectFit: "cover",
    borderRadius: "14px",
    marginBottom: "12px",
    display: "block",
  },

  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.03)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
  },

  headerText: {
    flex: 1,
    textAlign: "left",
  },

  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#111",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  desc: {
    fontSize: "13px",
    opacity: 0.7,
    marginTop: "5px",
    marginBottom: "4px",
  },

  memberText: {
    fontSize: "12px",
    opacity: 0.6,
    marginTop: "2px",
  },

  button: {
    padding: "8px 14px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    flexShrink: 0,
  },

  tabs: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    margin: "14px 0",
  },

  tab: {
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid #d6d6d6",
    background: "#f0f0f0",
    color: "#222",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },

  activeTab: {
    background: "#111",
    color: "#fff",
  },

  feed: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "stretch",
    width: "100%",
    textAlign: "left",
  },

  about: {
    padding: "12px",
    border: "1px solid #eee",
    borderRadius: "12px",
    background: "#fafafa",
    fontSize: "13px",
    textAlign: "left",
  },

  aboutHeading: {
    fontSize: "14px",
    marginBottom: "8px",
  },

  aboutText: {
    margin: "6px 0",
  },

  hr: {
    margin: "12px 0",
    borderColor: "#f1f1f1",
  },

  muted: {
    fontSize: "12px",
    opacity: 0.6,
    padding: "8px",
  },

  modList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  modRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px",
    borderRadius: "10px",
    background: "#fff",
    border: "1px solid #eee",
  },

  modAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#eee",
  },

  modName: {
    fontSize: "13px",
    fontWeight: "700",
  },

  modInfo: {
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
  },

  adminMemberTag: {
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

  modMemberTag: {
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

  admin: {
    fontSize: "11px",
    background: "#111",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "6px",
  },

  mod: {
    fontSize: "11px",
    background: "#666",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "6px",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },

  iconButton: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontSize: "16px",
    lineHeight: 1,
    flexShrink: 0,
  },

  adminButton: {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    flexShrink: 0,
  },

  floatingCreateBtn: {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    background: "#1d9bf0",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  postIcon: {
    fontSize: "22px",
    fontWeight: "300",
    lineHeight: 1,
    marginTop: "-1px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    padding: "16px",
  },

  modalBox: {
    position: "relative",
    width: "100%",
    maxWidth: "520px",
    background: "#fff",
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "10px",
  },

  backBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "20px",
    color: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111",
  },

  requestQuestion: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "10px",
  },

  requestTextarea: {
    width: "100%",
    minHeight: "110px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "12px",
    boxSizing: "border-box",
    resize: "vertical",
  },

  requestChoices: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "12px",
  },

  requestChoiceBtn: {
    width: "100%",
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    borderRadius: "12px",
    padding: "10px",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: "600",
  },

  requestChoiceActive: {
    border: "2px solid #111",
    background: "#f7f7f7",
  },

  emptyState: {
    textAlign: "center",
    padding: "36px 20px",
    marginTop: "12px",
    border: "1px dashed #ddd",
    borderRadius: "14px",
    background: "#fafafa",
  },

  emptyTitle: {
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  emptyText: {
    fontSize: "14px",
    opacity: 0.6,
  },

  addArchiveBtn: {
    alignSelf: "center",
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    marginBottom: "8px",
  },

  archiveCard: {
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid #eee",
    background: "#fff",
  },

  archiveTitle: {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  archiveDesc: {
    fontSize: "13px",
    opacity: 0.7,
    marginBottom: "8px",
  },

  archiveLink: {
    display: "inline-block",
    fontSize: "13px",
    color: "#1d9bf0",
    fontWeight: "600",
    marginBottom: "8px",
  },

  archiveImage: {
    width: "100%",
    maxHeight: "300px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #eee",
  },

  archiveInput: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "10px",
    boxSizing: "border-box",
  },

  archiveTextarea: {
    width: "100%",
    minHeight: "90px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    marginBottom: "10px",
    boxSizing: "border-box",
    resize: "vertical",
  },

  saveArchiveBtn: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  archiveUploadBox: {
    width: "180px",
    height: "180px",
    border: "2px dashed #8bb9ee",
    borderRadius: "18px",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    margin: "0 auto 10px",
  },

  archiveUploadInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    color: "#4d94d8",
  },

  archiveCameraIcon: {
    fontSize: "38px",
  },

  archiveUploadText: {
    fontSize: "17px",
    fontWeight: "700",
    textAlign: "center",
  },

  hiddenArchiveFile: {
    display: "none",
  },

  archiveFileName: {
    fontSize: "12px",
    opacity: 0.6,
    marginBottom: "10px",
  },

  showMoreBtn: {
    marginTop: "8px",
    border: "none",
    background: "transparent",
    color: "#1d9bf0",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    padding: 0,
  },
};