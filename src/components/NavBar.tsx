import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-bold text-indigo-600">
          ShelfMate
        </Link>
        <Link href="/search" className="text-sm hover:underline">
          Search
        </Link>
        <Link href="/community" className="text-sm hover:underline">
          Community
        </Link>
        <Link href="/chat" className="text-sm hover:underline">
          AI Chat
        </Link>

        <div className="ml-auto">
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="text-sm text-gray-600 hover:underline">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
