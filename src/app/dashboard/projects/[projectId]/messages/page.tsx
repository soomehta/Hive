import type { Metadata } from "next";
import { PageClient } from "./messages-client";

export const metadata: Metadata = {
  title: "Messages | Hive",
};

export default function Page() {
  return <PageClient />;
}
