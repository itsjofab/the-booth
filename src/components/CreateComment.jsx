import { useState } from "react";

export default function CreateComment({
  onCreate,
  replyingTo,
  onCancelReply,
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    const cleanText = text.trim();

    if (!cleanText || loading) return;

    setLoading(true);

    try {
      await onCreate(cleanText);
      setText("");
    } catch (err) {
      console.error("CREATE COMMENT ERROR:", err);
      alert(err.message || "Could not create comment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={styles.container}>
      {replyingTo && (
        <div style={styles.replyingTo}>
          Replying to comment

          <button
            type="button"
            onClick={onCancelReply}
            style={styles.cancelReply}
          >
            Cancel
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={replyingTo ? "Write your reply..." : "Write a comment..."}
        style={styles.textarea}
      />

      <div style={styles.actions}>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            ...styles.button,
            opacity: loading || !text.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "Posting..." : replyingTo ? "Reply" : "Comment"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  container: {
    marginBottom: "14px",
  },

  replyingTo: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cancelReply: {
    border: "none",
    background: "transparent",
    color: "#555",
    cursor: "pointer",
    fontSize: "12px",
  },

  textarea: {
    width: "100%",
    minHeight: "70px",
    resize: "vertical",
    borderRadius: "12px",
    border: "1px solid #ddd",
    padding: "10px",
    fontSize: "14px",
    boxSizing: "border-box",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },

  button: {
    border: "none",
    borderRadius: "999px",
    background: "#111",
    color: "#fff",
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
};