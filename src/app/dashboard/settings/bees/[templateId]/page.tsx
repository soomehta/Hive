import type { Metadata } from "next";
import { TemplateEditorClient } from "./template-editor-client";

export const metadata: Metadata = {
  title: "Edit Bee Template | Hive",
};

export default function TemplateEditorPage() {
  return <TemplateEditorClient />;
}
