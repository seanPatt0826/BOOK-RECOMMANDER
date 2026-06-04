import ChatBox from "@/components/ChatBox";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">AI Chat</h1>
      <p className="mt-1 text-gray-600">
        Chat about books and movies and get recommendations.
      </p>
      <ChatBox />
    </main>
  );
}
