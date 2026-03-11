import type { Metadata } from "next";
import { ChatClient } from "../../chat-client";

export const metadata: Metadata = {
  title: "Channel | Hive",
};

interface PageProps {
  params: Promise<{ channelId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { channelId } = await params;
  return <ChatClient initialChannelId={channelId} />;
}
