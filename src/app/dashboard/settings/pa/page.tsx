"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, Save, Loader2 } from "lucide-react";

export default function PASettingsPage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["pa-profile"],
    queryFn: async () => {
      const res = await apiClient("/api/pa/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const json = await res.json();
      return json.data;
    },
  });

  const [form, setForm] = useState({
    autonomyMode: "copilot",
    verbosity: "concise",
    formality: "professional",
    morningBriefingEnabled: true,
    morningBriefingTime: "08:45",
    weeklyDigestEnabled: true,
    timezone: "UTC",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        autonomyMode: profile.autonomyMode,
        verbosity: profile.verbosity,
        formality: profile.formality,
        morningBriefingEnabled: profile.morningBriefingEnabled,
        morningBriefingTime: profile.morningBriefingTime ?? "08:45",
        weeklyDigestEnabled: profile.weeklyDigestEnabled,
        timezone: profile.timezone,
        workingHoursStart: profile.workingHoursStart ?? "09:00",
        workingHoursEnd: profile.workingHoursEnd ?? "17:00",
      });
    }
  }, [profile]);

  const update = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await apiClient("/api/pa/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-profile"] });
    },
  });

  function handleSave() {
    update.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="size-6 text-violet-400" />
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">PA Settings</h1>
          <p className="text-sm text-zinc-500">Configure your Personal Assistant preferences</p>
        </div>
      </div>

      {/* Autonomy Mode */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">Autonomy Mode</CardTitle>
          <CardDescription>Control how much your PA does automatically</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.autonomyMode} onValueChange={(v) => setForm({ ...form, autonomyMode: v })}>
            <SelectTrigger className="w-full border-zinc-700 bg-zinc-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="autopilot">Auto-pilot -- PA acts, you supervise</SelectItem>
              <SelectItem value="copilot">Co-pilot -- PA suggests, you approve key actions</SelectItem>
              <SelectItem value="manual">Manual -- PA always asks before acting</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">Communication Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Verbosity</Label>
            <Select value={form.verbosity} onValueChange={(v) => setForm({ ...form, verbosity: v })}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="bullet_points">Bullet Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Formality</Label>
            <Select value={form.formality} onValueChange={(v) => setForm({ ...form, formality: v })}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">Working Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Start</Label>
              <input
                type="time"
                value={form.workingHoursStart}
                onChange={(e) => setForm({ ...form, workingHoursStart: e.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">End</Label>
              <input
                type="time"
                value={form.workingHoursEnd}
                onChange={(e) => setForm({ ...form, workingHoursEnd: e.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                <SelectItem value="America/Chicago">Central (US)</SelectItem>
                <SelectItem value="America/Denver">Mountain (US)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Briefings */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">Briefings & Digests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">Morning Briefing</p>
              <p className="text-xs text-zinc-500">Daily task overview at {form.morningBriefingTime}</p>
            </div>
            <button
              onClick={() => setForm({ ...form, morningBriefingEnabled: !form.morningBriefingEnabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.morningBriefingEnabled ? "bg-violet-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${
                  form.morningBriefingEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">Weekly Digest</p>
              <p className="text-xs text-zinc-500">Summary every Friday</p>
            </div>
            <button
              onClick={() => setForm({ ...form, weeklyDigestEnabled: !form.weeklyDigestEnabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.weeklyDigestEnabled ? "bg-violet-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${
                  form.weeklyDigestEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={update.isPending} className="gap-2 bg-violet-600 hover:bg-violet-700">
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
