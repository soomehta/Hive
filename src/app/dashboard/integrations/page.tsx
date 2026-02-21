import type { Metadata } from "next";
import { PageClient } from "./integrations-client";

export const metadata: Metadata = {
  title: "Integrations | Hive",
};

export default function Page() {
  return <PageClient />;
}
