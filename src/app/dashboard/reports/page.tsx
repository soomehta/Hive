import type { Metadata } from "next";
import { PageClient } from "./reports-client";

export const metadata: Metadata = {
  title: "Reports | Hive",
};

export default function Page() {
  return <PageClient />;
}
