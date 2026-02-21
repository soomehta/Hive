import type { Metadata } from "next";
import { PageClient } from "./new-project-client";

export const metadata: Metadata = {
  title: "New Project | Hive",
};

export default function Page() {
  return <PageClient />;
}
