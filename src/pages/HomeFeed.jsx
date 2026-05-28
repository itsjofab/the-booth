import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import { fetchPosts } from "../lib/feedService";
import { isDemoUser } from "../utils/demoUser";
import { demoReportedFeedPost } from "../utils/demoData";
import { getDemoSandbox } from "../utils/demoSandbox";

const PAGE_SIZE = 10;

export default function HomeFeed() {
  const [posts, setPosts] = useState([]);
  const [communityIds, setCommunityIds] = useState(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  /* ------------------------------
     👤 LOAD MEMBERSHIPS
  ------------------------------ */
  useEffect(() => {
    const loadMemberships = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setCommunityIds([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("memberships")
        .select("community_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("LOAD MEMBERSHIPS ERROR:", error);
        setCommunityIds([]);
        setLoading(false);
        return;
      }

      const ids = data?.map((m) => m.community_id) || [];
      setCommunityIds(ids);
    };

    loadMemberships();
  }, []);

  /* ------------------------------
     📥 FETCH POSTS
  ------------------------------ */
  useEffect(() => {
    const loadPosts = async () => {
      if (communityIds === null) return;

      const isFirstLoad = page === 0;

      if (communityIds.length === 0) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        setHasMore(false);
        return;
      }

      if (isFirstLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const paginated = await fetchPosts({
          type: "home",
          communityIds,
          from,
          to,
        });

        const paginatedWithProfiles = (paginated || []).map((post) => ({
          ...post,
          profile: post.profile || post.profiles || null,
        }));

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        const sandbox = getDemoSandbox();
        const demoPosts = sandbox.posts || [];

        const finalPosts =
          isDemoUser(user) && isFirstLoad
            ? [demoReportedFeedPost, ...demoPosts, ...paginatedWithProfiles]
            : paginatedWithProfiles;

        if (isFirstLoad) {
          setPosts(finalPosts);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));

            const uniqueNew = paginatedWithProfiles.filter(
              (p) => !existingIds.has(p.id)
            );

            return [...prev, ...uniqueNew];
          });
        }

        setHasMore(
          paginatedWithProfiles.length === PAGE_SIZE
        );
      } catch (err) {
        console.error("HOME FEED ERROR:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    };

    loadPosts();
  }, [communityIds, page, refreshKey]);

  /* ------------------------------
     📜 SCROLL HANDLING
  ------------------------------ */
 useEffect(() => {
  let ticking = false;

  const handleScroll = () => {
    if (ticking) return;

    ticking = true;

    requestAnimationFrame(() => {
      if (loadingMore || loading || refreshing) {
        ticking = false;
        return;
      }

      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 240;

      if (nearBottom && hasMore) {
        setPage((prev) => prev + 1);
      }

      setShowTopBtn(window.scrollY > 500);
      ticking = false;
    });
  };

  window.addEventListener("scroll", handleScroll);

  return () =>
    window.removeEventListener("scroll", handleScroll);
}, [loadingMore, loading, refreshing, hasMore]);

  /* ------------------------------
     🔄 REFRESH
  ------------------------------ */
  const refreshFeed = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    setRefreshKey((prev) => prev + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const isInitializing = communityIds === null;
  const showInitialLoading =
    isInitializing && posts.length === 0;

  return (
    <div style={styles.container}>
     {/* HEADER */}
<div style={styles.header}>
  <button
    onClick={refreshFeed}
    disabled={showInitialLoading}
    style={{
      ...styles.refreshBtn,
      opacity: showInitialLoading ? 0.5 : 1,
    }}
    title="Refresh feed"
  >
    🔄
  </button>

  <h2 style={styles.title}>🏠 Home</h2>

  <div style={styles.subtitle}>
    Latest from your communities
  </div>
</div>

      {/* INITIAL LOADING */}
      {showInitialLoading && (
        <div style={styles.feedGap}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {/* POSTS */}
      {!showInitialLoading && (
        <div style={styles.feed}>
          {posts.map((post, index) => (
            <div key={post.id} style={styles.postWrapper}>
              <PostCard
                post={post}
                onDeleted={(postId) => {
                  setPosts((prev) => prev.filter((p) => p.id !== postId));
                }}
                onUpdated={(updatedPost) => {
                  setPosts((prev) =>
                    prev.map((p) =>
                      p.id === updatedPost.id
                        ? { ...p, ...updatedPost }
                        : p
                    )
                  );
                }}
              />

              {index !== posts.length - 1 && (
                <div style={styles.divider} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* LOADING MORE */}
      {loadingMore && (
        <div style={styles.feedGap}>
          <PostSkeleton />
        </div>
      )}

      {/* CAUGHT UP */}
      {!showInitialLoading &&
        !loadingMore &&
        posts.length > 0 &&
        !hasMore && (
          <div style={styles.endState}>
            <div style={styles.endIcon}>🎉</div>
            <div style={styles.endTitle}>
              You’re all caught up
            </div>
            <div style={styles.endText}>
              You’ve seen the latest posts from your communities.
            </div>
          </div>
        )}

      {/* EMPTY STATE */}
      {!showInitialLoading &&
        communityIds?.length > 0 &&
        posts.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>😶 No posts yet</div>
            <div style={styles.emptyText}>
              Your communities don’t have posts yet.
            </div>
          </div>
        )}

      {/* NO COMMUNITIES */}
      {!showInitialLoading &&
        communityIds?.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>
              🏘️ Join communities
            </div>
            <div style={styles.emptyText}>
  Discover and join communities to start seeing posts.
</div>
          </div>
        )}

      {/* BACK TO TOP */}
      {showTopBtn && (
        <button
          onClick={scrollToTop}
          style={styles.topBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform =
              "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform =
              "translateY(0)";
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "80vh",
  },

  header: {
    position: "relative",
    marginBottom: "18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "4px",
  },

  title: {
    margin: 0,
    fontSize: "22px",
  },

  subtitle: {
    fontSize: "13px",
    opacity: 0.6,
  },

  refreshBtn: {
    position: "absolute",
    top: "0",
    right: "0",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
    padding: 0,
  },

  feed: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    textAlign: "left",
  },

  postWrapper: {
    paddingBottom: "8px",
    width: "100%",
  },

  divider: {
    height: "1px",
    background: "#f0f0f0",
    margin: "6px 0 10px",
  },

  feedGap: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  endState: {
    textAlign: "center",
    padding: "30px 22px",
    marginTop: "22px",
    border: "1px solid #eee",
    borderRadius: "14px",
    background: "#fafafa",
  },

  endIcon: {
    fontSize: "24px",
    marginBottom: "8px",
  },

  endTitle: {
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  endText: {
    fontSize: "14px",
    opacity: 0.6,
    marginBottom: "14px",
  },

  endButton: {
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "9px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },

  emptyState: {
    textAlign: "center",
    padding: "42px 20px",
    marginTop: "20px",
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
    marginBottom: "14px",
  },

  topBtn: {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "9px 13px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.15s ease",
  },
};