"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { OAuthButton } from "./oauth-button";

interface IntegrationCardProps {
  provider: "google" | "microsoft" | "slack";
  name: string;
  description: string;
  features: string[];
  authUrl: string;
  connectedEmail?: string;
  isConnected: boolean;
  onDisconnect?: () => void;
  isDisconnecting?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  google: "text-blue-400 border-blue-400/30",
  microsoft: "text-cyan-400 border-cyan-400/30",
  slack: "text-purple-400 border-purple-400/30",
};

export function IntegrationCard({
  provider,
  name,
  description,
  features,
  authUrl,
  connectedEmail,
  isConnected,
  onDisconnect,
  isDisconnecting,
}: IntegrationCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Card className="border-border bg-muted">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{name}</h3>
              {isConnected ? (
                <Badge variant="outline" className="gap-1 border-green-500/30 text-green-400 text-xs">
                  <Check className="size-3" aria-hidden="true" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                  Not connected
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {connectedEmail && (
              <p className="text-xs text-muted-foreground">Connected as {connectedEmail}</p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {features.map((f) => (
                <Badge key={f} variant="outline" className={`text-xs ${PROVIDER_COLORS[provider]}`}>
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          <div className="shrink-0">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={isDisconnecting}
                className="gap-1 border-border text-muted-foreground hover:border-red-500 hover:text-red-400"
              >
                {isDisconnecting ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
                Disconnect
              </Button>
            ) : (
              <OAuthButton authUrl={authUrl} provider={name} />
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to your {name} account. Your PA will no longer be able to access {description.toLowerCase()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDisconnect?.();
                setConfirmOpen(false);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
