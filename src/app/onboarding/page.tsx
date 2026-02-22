"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/utils/api-client";
import { Hexagon, Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { PathwayStep } from "./pathway-step";
import { LayoutStep } from "./layout-step";
import { AssistantIntroStep } from "./assistant-intro-step";
import type { Pathway } from "@/types/bees";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Step = "org" | "pathway" | "layout" | "assistant";
const STEPS: Step[] = ["org", "pathway", "layout", "assistant"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [presetIndex, setPresetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  async function handleCreateOrg() {
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient("/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      const org = await res.json();
      sessionStorage.setItem("hive-org-id", org.id);
      setOrgId(org.id);
      setStep("pathway");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPathway() {
    if (!pathway || !orgId) return;
    setLoading(true);

    try {
      await apiClient("/api/dashboard/pathway", {
        method: "POST",
        body: JSON.stringify({ pathway }),
        headers: { "x-org-id": orgId },
      });
      setStep("layout");
    } catch {
      // Non-critical, continue
      setStep("layout");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLayout() {
    if (!pathway || !orgId) return;
    setLoading(true);

    try {
      const { getPreset } = await import("@/lib/dashboard/presets");
      const preset = getPreset(pathway, presetIndex);

      await apiClient("/api/dashboard/layouts", {
        method: "POST",
        body: JSON.stringify({
          pathway,
          layoutPresetIndex: presetIndex,
          slots: preset.slots,
          isDefault: true,
        }),
        headers: { "x-org-id": orgId },
      });

      setStep("assistant");
    } catch {
      setStep("assistant");
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    router.push("/dashboard");
    router.refresh();
  }

  function handleBack() {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <Hexagon className="size-8 fill-primary text-primary-foreground" />
          <span className="text-2xl font-bold tracking-tight">Hive</span>
        </Link>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-6 max-w-md mx-auto">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= stepIndex ? "bg-violet-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="w-full">
          {/* Step 1: Create org */}
          {step === "org" && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                  Create your organization
                </CardTitle>
                <CardDescription>
                  Create your workspace to get started
                </CardDescription>
              </CardHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateOrg();
                }}
              >
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Acme Inc."
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                    />
                    {slug && (
                      <p className="text-muted-foreground text-xs">
                        Workspace URL:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {slug}
                        </span>
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight className="size-4 ml-1" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          {/* Step 2: Choose pathway */}
          {step === "pathway" && (
            <>
              <CardContent className="pt-6">
                <PathwayStep selected={pathway} onSelect={setPathway} />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSetPathway} disabled={!pathway || loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="size-4 ml-1" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step 3: Layout preview */}
          {step === "layout" && pathway && (
            <>
              <CardContent className="pt-6">
                <LayoutStep
                  pathway={pathway}
                  presetIndex={presetIndex}
                  onPresetChange={setPresetIndex}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSaveLayout} disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="size-4 ml-1" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step 4: Meet your assistant */}
          {step === "assistant" && (
            <>
              <CardContent className="pt-6">
                <AssistantIntroStep />
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={handleFinish} className="px-8">
                  <Check className="size-4 mr-1" /> Go to Dashboard
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
