import type { Metadata } from "next";
import { PageClient } from "./my-tasks-client";

export const metadata: Metadata = {
  title: "My Tasks | Hive",
};

export default function Page() {
  return <PageClient />;
}
