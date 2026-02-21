"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PAReportViewProps {
  narrative: string;
  data?: Record<string, any>;
  generatedAt?: string;
}

export function PAReportView({ narrative, data, generatedAt }: PAReportViewProps) {
  return (
    <Card className="border-border bg-muted">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-5 text-violet-400" />
          Report
        </CardTitle>
        {generatedAt && (
          <p className="text-xs text-muted-foreground">
            Generated {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{narrative}</p>
        </div>
        {data && Object.keys(data).length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">View raw data</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-muted-foreground">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
