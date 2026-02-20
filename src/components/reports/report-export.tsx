"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ClipboardCopy, Download } from "lucide-react";

interface ReportExportProps {
  narrative: string;
  data?: Record<string, unknown>;
}

export function ReportExport({ narrative, data }: ReportExportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(narrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where clipboard API is not available
      const textarea = document.createElement("textarea");
      textarea.value = narrative;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const filename = `hive-report-${dateStr}-${timeStr}.md`;

    let content = `# Report\n\n_Generated on ${now.toLocaleString()}_\n\n`;
    content += narrative;

    if (data) {
      content += `\n\n---\n\n## Raw Data\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="size-3" />
            Copied
          </>
        ) : (
          <>
            <ClipboardCopy className="size-3" />
            Copy
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Download className="size-3" />
        Download
      </Button>
    </div>
  );
}
