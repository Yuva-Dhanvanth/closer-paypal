import { ChatContainer } from "@/components/chat/ChatContainer";

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function StorefrontPage({
  params,
  searchParams,
}: StorefrontPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const conversationId = sp.conversationId;

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-center">
      <ChatContainer
        sellerSlug={slug}
        initialConversationId={conversationId}
      />
    </main>
  );
}
