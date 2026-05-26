import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Comments({ postId }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ LOAD COMMENTS (NO useCallback, NO dependency issues)
  useEffect(() => {
    if (!postId) return;

    let isActive = true;

    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, post_id, user_id, content, parent_comment_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD COMMENTS ERROR:", error);
        return;
      }

      if (!isActive) return;

      setComments(data || []);
    };

    fetchComments();

    return () => {
      isActive = false;
    };
  }, [postId]);

  // ➕ CREATE COMMENT
  const createComment = async () => {
    if (!content.trim()) return;

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) return;

      await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content,
      });

      setContent("");

      // 🔄 refresh comments safely (no effect needed)
      const { data } = await supabase
        .from("comments")
        .select("id, post_id, user_id, content, parent_comment_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      setComments(data || []);
    } catch (err) {
      console.error("CREATE COMMENT ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* INPUT */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
      />

      <button onClick={createComment} disabled={loading}>
        {loading ? "Posting..." : "Comment"}
      </button>

      {/* LIST */}
      <div style={{ marginTop: "12px" }}>
        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "8px",
              borderBottom: "1px solid #eee",
              fontSize: "14px",
            }}
          >
            {c.content}
          </div>
        ))}
      </div>
    </div>
  );
}