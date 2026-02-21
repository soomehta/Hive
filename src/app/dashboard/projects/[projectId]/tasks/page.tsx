import type { Metadata } from "next";
import { PageClient } from "./tasks-client";

export const metadata: Metadata = {
  title: "Tasks | Hive",
};

export default function Page() {
  return <PageClient />;
}
