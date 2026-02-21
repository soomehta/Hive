import type { Metadata } from "next";
import { PageClient } from "./project-detail-client";

export const metadata: Metadata = {
  title: "Project | Hive",
};

export default function Page() {
  return <PageClient />;
}
