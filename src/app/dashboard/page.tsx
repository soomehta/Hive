import type { Metadata } from "next";
import { PageClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard | Hive",
};

export default function Page() {
  return <PageClient />;
}
