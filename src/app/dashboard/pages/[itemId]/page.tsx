import type { Metadata } from "next";
import { PageEditorClient } from "./page-editor-client";

export const metadata: Metadata = {
  title: "Page | Hive",
};

interface PageProps {
  params: Promise<{ itemId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { itemId } = await params;
  return <PageEditorClient itemId={itemId} />;
}
