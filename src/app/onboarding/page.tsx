"use client";

import Link from "next/link";
import { Hexagon } from "lucide-react";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-center pt-10 pb-2">
        <Link href="/" className="flex items-center gap-2">
          <Hexagon className="size-7 text-muted-foreground" />
          <span className="text-xl font-semibold tracking-tight text-foreground">Hive</span>
        </Link>
      </div>

      {/* Headline */}
      <div className="text-center px-4 pt-6 pb-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Let&apos;s build your workspace.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground/70">
          A few quick questions and you&apos;re in.
        </p>
      </div>

      {/* Chat area */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
        <OnboardingChat />
      </div>
    </div>
  );
}
