import type { Metadata } from "next";
import { PageClient } from "./team-client";

export const metadata: Metadata = {
  title: "Team | Hive",
};

export default function Page() {
  return <PageClient />;
}
