import type { Metadata } from "next";
import { PageClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings | Hive",
};

export default function Page() {
  return <PageClient />;
}
