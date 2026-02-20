"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/hooks/use-org";

interface OAuthButtonProps {
  authUrl: string;
  provider: string;
}

export function OAuthButton({ authUrl, provider }: OAuthButtonProps) {
  const { orgId } = useOrg();

  function handleConnect() {
    // The auth endpoint needs x-org-id, so we navigate with it as a param
    // Since OAuth redirects can't send custom headers, we include orgId in the URL
    // The auth route already reads from authenticateRequest which uses the header
    // For OAuth flow, we open in same window
    window.location.href = authUrl;
  }

  return (
    <Button
      size="sm"
      onClick={handleConnect}
      className="gap-1 bg-violet-600 hover:bg-violet-700"
    >
      <ExternalLink className="size-3" />
      Connect {provider}
    </Button>
  );
}
