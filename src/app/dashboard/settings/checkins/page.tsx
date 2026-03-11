"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useOrg } from "@/hooks/use-org";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "daily" | "standard" | "minimal" | "off";

interface CheckinPrefs {
  frequency: Frequency;
  preferredTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxCheckinsPerDay: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: CheckinPrefs = {
  frequency: "standard",
  preferredTime: "10:00",
  quietHoursStart: "18:00",
  quietHoursEnd: "08:00",
  maxCheckinsPerDay: 5,
};

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "standard", label: "Standard (recommended)" },
  { value: "minimal", label: "Minimal" },
  { value: "off", label: "Off" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckinSettingsPage() {
  const { orgId } = useOrg();
  const [prefs, setPrefs] = useState<CheckinPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  // Load the user's existing preferences.
  useEffect(() => {
    if (!orgId) return;

    fetch("/api/checkins/preferences", {
      headers: { "x-org-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setPrefs(data.data as CheckinPrefs);
      })
      .catch(() => {
        // Non-fatal — defaults remain in place.
      });
  }, [orgId]);

  // Persist changes via PUT.
  async function handleSave() {
    if (!orgId || saving) return;

    setSaving(true);
    setSaveState("idle");

    try {
      const res = await fetch("/api/checkins/preferences", {
        method: "PUT",
        headers: {
          "x-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefs),
      });

      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    } finally {
      setSaving(false);
      // Reset the status message after 2.5 s.
      setTimeout(() => setSaveState("idle"), 2500);
    }
  }

  function updatePref<K extends keyof CheckinPrefs>(
    key: K,
    value: CheckinPrefs[K]
  ) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* ─── Page heading ─── */}
      <div className="flex items-center gap-3">
        <Bell className="size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-semibold">Check-in Preferences</h1>
      </div>

      {/* ─── Form card ─── */}
      <div className="space-y-5 rounded-xl border p-6">
        {/* Frequency */}
        <div>
          <label
            htmlFor="checkin-frequency"
            className="mb-1 block text-sm font-medium"
          >
            Frequency
          </label>
          <select
            id="checkin-frequency"
            value={prefs.frequency}
            onChange={(e) =>
              updatePref("frequency", e.target.value as Frequency)
            }
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Controls how often the PA sends proactive check-in messages.
          </p>
        </div>

        {/* Preferred time */}
        <div>
          <label
            htmlFor="checkin-preferred-time"
            className="mb-1 block text-sm font-medium"
          >
            Preferred Time
          </label>
          <input
            id="checkin-preferred-time"
            type="time"
            value={prefs.preferredTime}
            onChange={(e) => updatePref("preferredTime", e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The PA will prefer this time for daily check-ins.
          </p>
        </div>

        {/* Quiet hours */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Quiet Hours</legend>
          <p className="mb-3 text-xs text-muted-foreground">
            The PA will not send check-ins during this window.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="checkin-quiet-start"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Start
              </label>
              <input
                id="checkin-quiet-start"
                type="time"
                value={prefs.quietHoursStart}
                onChange={(e) =>
                  updatePref("quietHoursStart", e.target.value)
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="checkin-quiet-end"
                className="mb-1 block text-xs text-muted-foreground"
              >
                End
              </label>
              <input
                id="checkin-quiet-end"
                type="time"
                value={prefs.quietHoursEnd}
                onChange={(e) => updatePref("quietHoursEnd", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </fieldset>

        {/* Max per day */}
        <div>
          <label
            htmlFor="checkin-max-per-day"
            className="mb-1 block text-sm font-medium"
          >
            Max Check-ins Per Day
          </label>
          <input
            id="checkin-max-per-day"
            type="number"
            min={0}
            max={20}
            value={prefs.maxCheckinsPerDay}
            onChange={(e) =>
              updatePref(
                "maxCheckinsPerDay",
                Math.min(20, Math.max(0, parseInt(e.target.value) || 0))
              )
            }
            className="w-24 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The PA will not exceed this limit regardless of frequency.
          </p>
        </div>

        {/* Save row */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
            className="neu-btn rounded-xl px-6 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>

          {saveState === "saved" && (
            <span
              role="status"
              className="text-sm font-medium text-green-600 dark:text-green-400"
            >
              Saved!
            </span>
          )}
          {saveState === "error" && (
            <span role="alert" className="text-sm font-medium text-destructive">
              Save failed. Please try again.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
