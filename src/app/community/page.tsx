import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBoardThread } from "@/lib/board";
import { createBoardPost, deleteBoardPost } from "@/lib/board-actions";
import CommentForm from "@/components/CommentForm";
import DeleteCommentButton from "@/components/DeleteCommentButton";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const thread = await getBoardThread();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">Community board</h1>
      <p className="mt-1 text-gray-600">
        Share what you&rsquo;re reading and watching.
      </p>

      {user ? (
        <CommentForm
          action={createBoardPost.bind(null, null)}
          placeholder="Start a new post…"
          submitLabel="Post"
        />
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>{" "}
          to post.
        </p>
      )}

      <ul className="mt-8 space-y-6">
        {thread.length === 0 && (
          <li className="text-sm text-gray-500">
            No posts yet. Start the conversation!
          </li>
        )}
        {thread.map((post) => (
          <li
            key={post.id}
            className="rounded border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{post.authorName}</span>
              {user?.id === post.userId && (
                <DeleteCommentButton
                  action={deleteBoardPost.bind(null, post.id)}
                />
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {post.body}
            </p>

            {post.replies.length > 0 && (
              <ul className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4">
                {post.replies.map((reply) => (
                  <li key={reply.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {reply.authorName}
                      </span>
                      {user?.id === reply.userId && (
                        <DeleteCommentButton
                          action={deleteBoardPost.bind(null, reply.id)}
                        />
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {reply.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {user && (
              <div className="mt-2">
                <CommentForm
                  action={createBoardPost.bind(null, post.id)}
                  placeholder="Reply…"
                  submitLabel="Reply"
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
