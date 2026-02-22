import type { Metadata } from "next";
import { DashboardPageClient } from "./dashboard-page-client";

export const metadata: Metadata = {
  title: "Dashboard | Hive",
};

export default function Page() {
  return <DashboardPageClient />;
}
