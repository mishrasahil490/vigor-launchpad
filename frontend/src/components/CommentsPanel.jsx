import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import api from "../api/client";

/**
 * Reusable Comments Panel
 * Props:
 *   entityType  - e.g. "client", "vendor", "influencer", "campaign", "event"
 *   entityId    - numeric ID of the record
 */
export default function CommentsPanel({ entityType, entityId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  function loadComments() {
    if (!entityId) return;
    api
      .get("/comments", { params: { entityType, entityId } })
      .then((res) => setComments(res.data?.data || []))
      .catch(() => setComments([]));
  }

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  async function postComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post("/comments", { entityType, entityId, message: text.trim() });
      setText("");
      loadComments();
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="label mb-3 flex items-center gap-1.5">
        <MessageSquare size={13} /> Comments
      </p>

      {/* Post new comment */}
      <form onSubmit={postComment} className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="btn-primary !px-3 disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </form>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-ink-400 italic">No comments yet. Be the first to add one!</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="border-l-2 border-brand-300 dark:border-brand-500 pl-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">
                {c.authorName}
              </span>
              <span className="text-[10px] text-ink-400">
                {new Date(c.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-ink-700 dark:text-ink-100">{c.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
