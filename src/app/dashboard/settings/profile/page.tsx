import type { Metadata } from "next";
import { PageClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Profile | Hive",
};

export default function Page() {
  return <PageClient />;
}
