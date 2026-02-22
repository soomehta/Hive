import type { Metadata } from "next";
import { ProjectSettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Project Settings | Hive",
};

export default function Page() {
  return <ProjectSettingsClient />;
}
