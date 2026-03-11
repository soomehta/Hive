"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { Plug, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";

const PROVIDERS = [
  {
    id: "google" as const,
    name: "Google",
    description: "Google Calendar and Gmail",
    features: ["Calendar events", "Email reading", "Send emails"],
    authUrl: "/api/integrations/google/auth",
  },
  {
    id: "microsoft" as const,
    name: "Microsoft",
    description: "Outlook Calendar and Mail",
    features: ["Calendar events", "Email reading", "Send emails"],
    authUrl: "/api/integrations/microsoft/auth",
  },
  {
    id: "slack" as const,
    name: "Slack",
    description: "Slack messaging",
    features: ["Send messages", "Channel access"],
    authUrl: "/api/integrations/slack/auth",
  },
];

export function PageClient() {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading, isError, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await apiClient("/api/integrations");
      if (!res.ok) throw new Error("Failed to fetch integrations");
      const json = await res.json();
      return json.data as Array<{
        id: string;
        provider: string;
        providerAccountEmail: string | null;
        isActive: boolean;
        tokenExpiresAt: string | null;
      }>;
    },
  });

  const disconnect = useMutation({
    mutationFn: async (integrationId: string) => {
      const res = await apiClient(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Plug className="size-6 text-violet-400" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
          </div>
        </div>
        <ErrorState
          message="Failed to load integrations."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Plug className="size-6 text-violet-400" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        </div>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => {
          const connected = integrations?.find((i) => i.provider === provider.id && i.isActive);
          const isExpired = connected?.tokenExpiresAt
            ? new Date(connected.tokenExpiresAt) < new Date()
            : false;
          return (
            <IntegrationCard
              key={provider.id}
              provider={provider.id}
              name={provider.name}
              description={provider.description}
              features={provider.features}
              authUrl={provider.authUrl}
              connectedEmail={connected?.providerAccountEmail ?? undefined}
              isConnected={!!connected}
              isTokenExpired={isExpired}
              onDisconnect={connected ? () => disconnect.mutate(connected.id) : undefined}
              isDisconnecting={disconnect.isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
