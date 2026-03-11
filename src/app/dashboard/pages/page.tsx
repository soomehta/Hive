import type { Metadata } from "next";
import { PagesListClient } from "./pages-list-client";

export const metadata: Metadata = {
  title: "Pages | Hive",
};

export default function PagesListPage() {
  return <PagesListClient />;
}
