"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BeeAvatar } from "@/components/bees/bee-avatar";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { BeeTemplate, BeeType } from "@/types/bees";

export function TemplateEditorClient() {
  const params = useParams();
  const router = useRouter();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();
  const templateId = params.templateId as string;

  const { data: template, isLoading } = useQuery({
    queryKey: ["bee-template", templateId],
    queryFn: async () => {
      const res = await apiClient(`/api/bees/templates/${templateId}`);
      if (!res.ok) throw new Error("Not found");
      return (await res.json()) as BeeTemplate;
    },
    enabled: !!orgId && !!templateId,
  });

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [subtype, setSubtype] = useState("none");
  const [autonomyTier, setAutonomyTier] = useState("draft_approve");
  const [triggerKeywords, setTriggerKeywords] = useState("");
  const [triggerIntents, setTriggerIntents] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSystemPrompt(template.systemPrompt);
      setSubtype(template.subtype);
      setAutonomyTier(template.defaultAutonomyTier);
      const conditions = template.triggerConditions as {
        keywords?: string[];
        intents?: string[];
      } | null;
      setTriggerKeywords(conditions?.keywords?.join(", ") ?? "");
      setTriggerIntents(conditions?.intents?.join(", ") ?? "");
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient(`/api/bees/templates/${templateId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          systemPrompt,
          subtype,
          defaultAutonomyTier: autonomyTier,
          triggerConditions: {
            keywords: triggerKeywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
            intents: triggerIntents
              .split(",")
              .map((i) => i.trim())
              .filter(Boolean),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: ["bee-template", templateId] });
      queryClient.invalidateQueries({ queryKey: ["bee-templates"] });
    },
    onError: () => toast.error("Failed to save template"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Template not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings/bees">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <BeeAvatar type={template.type as BeeType} size="lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {template.type}
            </Badge>
            {template.isSystem && (
              <Badge variant="secondary" className="text-xs">
                System
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subtype</Label>
                <Select value={subtype} onValueChange={setSubtype}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="orchestrator">Orchestrator</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Autonomy Tier</Label>
                <Select value={autonomyTier} onValueChange={setAutonomyTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_execute">Auto Execute</SelectItem>
                    <SelectItem value="execute_notify">Execute & Notify</SelectItem>
                    <SelectItem value="draft_approve">Draft & Approve</SelectItem>
                    <SelectItem value="suggest_only">Suggest Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trigger Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={triggerKeywords}
                onChange={(e) => setTriggerKeywords(e.target.value)}
                placeholder="analyze, report, metrics"
              />
            </div>
            <div className="space-y-2">
              <Label>Intents (comma-separated)</Label>
              <Input
                value={triggerIntents}
                onChange={(e) => setTriggerIntents(e.target.value)}
                placeholder="generate_report, check_project_status"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="size-4 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
