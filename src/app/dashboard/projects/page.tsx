import type { Metadata } from "next";
import { PageClient } from "./projects-client";

export const metadata: Metadata = {
  title: "Projects | Hive",
};

export default function Page() {
  return <PageClient />;
}
