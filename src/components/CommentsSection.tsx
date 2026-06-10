import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTitleComments } from "@/lib/comments";
import {
  createTitleComment,
  deleteTitleComment,
} from "@/lib/comments-actions";
import CommentForm from "@/components/CommentForm";
import DeleteCommentButton from "@/components/DeleteCommentButton";
import type { MediaType } from "@/lib/sources/types";

export default async function CommentsSection({
  itemId,
  itemType,
}: {
  itemId: string;
  itemType: MediaType;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const comments = await getTitleComments(itemId, itemType);

  return (
    <section className="mt-10 border-t border-edge pt-6">
      <h2 className="text-2xl font-semibold">Comments</h2>

      {user ? (
        <CommentForm action={createTitleComment.bind(null, itemId, itemType)} />
      ) : (
        <p className="mt-2 text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {comments.length === 0 && (
          <li className="text-sm text-muted">No comments yet. Be the first!</li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-edge bg-surface p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent">
                {c.authorName}
              </span>
              {user?.id === c.userId && (
                <DeleteCommentButton
                  action={deleteTitleComment.bind(null, c.id, itemId, itemType)}
                />
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink/90">
              {c.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
