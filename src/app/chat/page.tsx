import ChatBox from "@/components/ChatBox";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">AI Chat</h1>
      <p className="mt-1 text-muted">
        Chat about books and movies and get recommendations.
      </p>
      <ChatBox />
    </main>
  );
}
