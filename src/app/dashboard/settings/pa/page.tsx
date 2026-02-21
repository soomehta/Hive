import type { Metadata } from "next";
import { PageClient } from "./pa-settings-client";

export const metadata: Metadata = {
  title: "PA Settings | Hive",
};

export default function Page() {
  return <PageClient />;
}
