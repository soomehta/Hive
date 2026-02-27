import type { Metadata } from "next";
import { BeesSettingsClient } from "./bees-client";

export const metadata: Metadata = {
  title: "Bees | Hive",
};

export default function BeesSettingsPage() {
  return <BeesSettingsClient />;
}
