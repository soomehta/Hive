import type { Metadata } from "next";
import { NoticesClient } from "./notices-client";

export const metadata: Metadata = {
  title: "Notices | Hive",
};

export default function Page() {
  return <NoticesClient />;
}
