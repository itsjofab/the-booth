import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PostCard from "../components/PostCard";
import CommentCard from "../components/CommentCard";
import PostSkeleton from "../components/PostSkeleton";
import { attachPostProfiles } from "../utils/attachPostProfiles";
import {
  getAvatarUrl,
  getProfileBanner,
} from "../utils/uiDefaults";
import { isDemoUser } from "../utils/demoUser";
import {
  getDemoSandbox,
} from "../utils/demoSandbox";
import { demoReportedFeedPost } from "../utils/demoData";

export default function Profile() {
  const { id } = useParams();

  const [profile, setProfile] = useState(null);

  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);

  const [replies, setReplies] = useState([]);
  const [likedComments, setLikedComments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("posts");

  const attachCommentProfiles = async (commentRows) => {
    if (!commentRows?.length) return [];

    const userIds = [
      ...new Set(commentRows.map((c) => c.user_id).filter(Boolean)),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap = {};

    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    return commentRows.map((comment) => ({
      ...comment,
      profile: profileMap[comment.user_id] || null,
    }));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      const demoMode =
        isDemoUser(currentUser) && currentUser.id === id;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          bio,
          avatar_url,
          banner_url,
          x_username,
          threads_username,
          tiktok_username,
          created_at
        `)
        .eq("id", id)
        .single();

      if (profileError) {
        console.error("PROFILE LOAD ERROR:", profileError);
        setLoading(false);
        return;
      }

      if (demoMode) {
        const sandbox = getDemoSandbox();
        const sandboxProfile = sandbox.profile || {};

        setProfile({
          ...profileData,
          ...sandboxProfile,
        });
      } else {
        setProfile(profileData);
      }

      if (demoMode) {
        const sandbox = getDemoSandbox();

        const demoPosts = [
          demoReportedFeedPost,
          ...(sandbox.posts || []),
        ];

        setPosts(
          demoPosts.filter((post) => post.user_id === currentUser.id)
        );

        const demoComments = Object.values(sandbox.comments || {})
          .flat()
          .filter((comment) => comment.user_id === currentUser.id);

        setReplies(demoComments);

        const likedPostIds = sandbox.likedPostIds || [];

        setLikedPosts(
          demoPosts.filter((post) => likedPostIds.includes(post.id))
        );

        setLikedComments([]);
        setLoading(false);
        return;
      }


      // POSTS
      const { data: postsData, error: postsError } = await supabase
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
        .eq("user_id", id)
        .eq("is_hidden", false)
        .eq("is_reported", false)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("PROFILE POSTS ERROR:", postsError);
        setPosts([]);
      } else {
        const postsWithProfiles = await attachPostProfiles(postsData || []);
        setPosts(postsWithProfiles);
      }

      // REPLIES
      const { data: repliesData, error: repliesError } = await supabase
        .from("comments")
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_comment_id,
          image_url,
          media_url,
          media_type,
          gif_url,
          is_deleted,
          created_at
        `)
        .eq("user_id", id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (repliesError) {
        console.error("PROFILE REPLIES ERROR:", repliesError);
        setReplies([]);
      } else {
        const repliesWithProfiles = await attachCommentProfiles(
          repliesData || []
        );

        setReplies(repliesWithProfiles);
      }

      // LIKED POSTS
      const { data: likedRows, error: likedError } = await supabase
        .from("likes")
        .select(`
          id,
          post_id,
          posts (
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
          )
        `)
        .eq("user_id", id);

      if (likedError) {
        console.error("PROFILE LIKES ERROR:", likedError);
        setLikedPosts([]);
      } else {
        const cleanLikedPosts = (likedRows || [])
          .map((row) => row.posts)
          .filter(Boolean)
          .filter((post) => !post.is_hidden && !post.is_reported);

        const likedPostsWithProfiles =
          await attachPostProfiles(cleanLikedPosts);

        setLikedPosts(likedPostsWithProfiles);
      }

      // LIKED COMMENTS
      const {
        data: likedCommentRows,
        error: likedCommentsError,
      } = await supabase
        .from("comment_likes")
        .select(`
          id,
          comment_id,
          comments (
            id,
            post_id,
            user_id,
            content,
            parent_comment_id,
            image_url,
            media_url,
            media_type,
            gif_url,
            is_deleted,
            created_at
          )
        `)
        .eq("user_id", id);

      if (likedCommentsError) {
        console.error(
          "PROFILE LIKED COMMENTS ERROR:",
          likedCommentsError
        );

        setLikedComments([]);
      } else {
        const cleanLikedComments = (likedCommentRows || [])
          .map((row) => row.comments)
          .filter(Boolean)
          .filter((comment) => !comment.is_deleted);

        const likedCommentsWithProfiles =
          await attachCommentProfiles(cleanLikedComments);

        setLikedComments(likedCommentsWithProfiles);
      }

      setLoading(false);
    };

    load();
}, [id]);

  const formatJoinDate = (dateStr) => {
    if (!dateStr) return "";

    const d = new Date(dateStr);

    return `Joined ${d.toLocaleString("default", {
      month: "long",
      year: "numeric",
    })}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Profile not found.</p>
      </div>
    );
  }

  const bannerValue = getProfileBanner(profile);

  const bannerIsImage =
    typeof bannerValue === "string" &&
    bannerValue.startsWith("http");

  return (
    <div style={styles.container}>
      {bannerIsImage ? (
        <img
          src={bannerValue}
          alt="profile banner"
          style={styles.bannerImage}
        />
      ) : (
        <div
          style={{
            ...styles.banner,
            background: bannerValue,
          }}
        />
      )}

      <div style={styles.header}>
        <div style={styles.topRight}>
          <button style={styles.iconBtn}>🔍</button>

          <button
            style={styles.iconBtn}
            onClick={() => {
              window.location.href = "/profile/settings";
            }}
          >
            ✏️
          </button>
        </div>

        <div style={styles.profileBlock}>
          <div style={styles.avatarWrap}>
            <img
              src={getAvatarUrl(profile)}
              alt="avatar"
              style={styles.avatar}
            />
          </div>

          <div style={styles.textStack}>
            <div style={styles.name}>
              {profile?.full_name || profile?.username}
            </div>

            <div style={styles.handle}>
              @{profile?.username}
            </div>

            <div style={styles.bio}>
              {profile?.bio || ""}
            </div>

            {(profile?.x_username ||
              profile?.threads_username ||
              profile?.tiktok_username) && (
              <div style={styles.socialRow}>
                {profile?.x_username && (
                  <a
                    href={`https://x.com/${profile.x_username}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.socialLink}
                  >
                    𝕏 @{profile.x_username}
                  </a>
                )}

                {profile?.threads_username && (
                  <a
                    href={`https://threads.net/@${profile.threads_username}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.socialLink}
                  >
                    @{profile.threads_username} Threads
                  </a>
                )}

                {profile?.tiktok_username && (
                  <a
                    href={`https://tiktok.com/@${profile.tiktok_username}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.socialLink}
                  >
                    ♪ @{profile.tiktok_username}
                  </a>
                )}
              </div>
            )}

            <div style={styles.meta}>
              <span style={styles.metaIcon}>📅</span>
              {formatJoinDate(profile?.created_at)}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tabs}>
        {["posts", "replies", "likes"].map((t) => (
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
              <div style={styles.emptyTitle}>
                No posts yet
              </div>

              <div style={styles.emptyText}>
                Posts from this profile will show here.
              </div>
            </div>
          ) : (
            posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))
          )}
        </div>
      )}

{tab === "replies" && (
  <div style={styles.feed}>
    {replies.length === 0 ? (
      <div style={styles.emptyState}>
        <div style={styles.emptyTitle}>
          No replies yet
        </div>

        <div style={styles.emptyText}>
          Replies from this profile will show here.
        </div>
      </div>
    ) : (
      replies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          depth={0}
          hasReplies={false}
          profileStyle
        />
      ))
    )}
  </div>
)}

{tab === "likes" && (
  <div style={styles.feed}>
    {likedPosts.length === 0 &&
    likedComments.length === 0 ? (
      <div style={styles.emptyState}>
        <div style={styles.emptyTitle}>
          No likes yet
        </div>

        <div style={styles.emptyText}>
          Liked posts and replies will show here.
        </div>
      </div>
    ) : (
      [
        ...likedPosts.map((p) => ({
          type: "post",
          created_at: p.created_at,
          item: p,
        })),

        ...likedComments.map((comment) => ({
          type: "comment",
          created_at: comment.created_at,
          item: comment,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at)
        )
        .map((entry) =>
          entry.type === "post" ? (
            <PostCard
              key={`post-${entry.item.id}`}
              post={entry.item}
              onUnliked={() =>
                setLikedPosts((prev) =>
                  prev.filter((p) => p.id !== entry.item.id)
                )
              }
            />
          ) : (
            <CommentCard
              key={`comment-${entry.item.id}`}
              comment={entry.item}
              depth={0}
              hasReplies={false}
              profileStyle
              onUnliked={() =>
                setLikedComments((prev) =>
                  prev.filter((c) => c.id !== entry.item.id)
                )
              }
            />
          )
        )
    )}
  </div>
)}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    textAlign: "left",
  },

  banner: {
    height: "150px",
    borderRadius: "14px",
    overflow: "hidden",
  },

  bannerImage: {
    width: "100%",
    height: "150px",
    objectFit: "cover",
    borderRadius: "14px",
    display: "block",
  },

  header: {
    position: "relative",
    padding: "0 16px 8px",
    marginTop: "-42px",
  },

  topRight: {
    position: "absolute",
    right: "16px",
    top: "32px",
    display: "flex",
    gap: "8px",
  },

  iconBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
  },

  profileBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
  },

  avatarWrap: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    overflow: "hidden",
    border: "4px solid white",
    background: "#eee",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  avatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  textStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "100%",
  },

  name: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#111",
  },

  handle: {
    fontSize: "14px",
    color: "#666",
  },

  bio: {
    fontSize: "14px",
    color: "#333",
    marginTop: "4px",
  },

  socialRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "6px",
  },

  socialLink: {
    fontSize: "13px",
    color: "#1d9bf0",
    textDecoration: "none",
    fontWeight: "600",
  },

  meta: {
    fontSize: "12px",
    color: "#888",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "4px",
  },

  metaIcon: {
    fontSize: "13px",
    opacity: 0.6,
  },

  tabs: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    margin: "14px 0",
    padding: "0 16px",
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
    marginTop: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "0 16px",
  },

  muted: {
    fontSize: "14px",
    opacity: 0.6,
    padding: "16px",
  },

  emptyState: {
    textAlign: "center",
    padding: "36px 20px",
    marginTop: "16px",
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
};