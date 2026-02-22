"use client";

import { useState } from "react";
import { useBeeTemplates, useCreateBeeTemplate, useDeleteBeeTemplate, useUpdateBeeTemplate } from "@/hooks/use-bees";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BeeAvatar } from "@/components/bees/bee-avatar";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { BeeType } from "@/types/bees";

export function BeesSettingsClient() {
  const { data: templates, isLoading } = useBeeTemplates();
  const createTemplate = useCreateBeeTemplate();
  const deleteTemplate = useDeleteBeeTemplate();
  const updateTemplate = useUpdateBeeTemplate();
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<BeeType>("operator");
  const [newSubtype, setNewSubtype] = useState("specialist");
  const [newPrompt, setNewPrompt] = useState("");

  function handleCreate() {
    if (!newName || !newPrompt) return;

    createTemplate.mutate(
      {
        name: newName,
        type: newType,
        subtype: newSubtype,
        systemPrompt: newPrompt,
      },
      {
        onSuccess: () => {
          toast.success("Bee template created");
          setShowCreate(false);
          setNewName("");
          setNewPrompt("");
        },
        onError: () => toast.error("Failed to create template"),
      }
    );
  }

  function handleToggleActive(templateId: string, isActive: boolean) {
    updateTemplate.mutate(
      { templateId, isActive: !isActive },
      {
        onSuccess: () => toast.success(isActive ? "Template deactivated" : "Template activated"),
        onError: () => toast.error("Failed to update template"),
      }
    );
  }

  function handleDelete(templateId: string) {
    deleteTemplate.mutate(templateId, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Cannot delete system templates"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bee Templates</h1>
          <p className="text-muted-foreground text-sm">
            Manage the specialized AI bees that power your workspace
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1" /> New Bee
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No bee templates yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <BeeAvatar type={template.type as BeeType} />
                    <div>
                      <CardTitle className="text-base">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {template.type} / {template.subtype}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                    <Badge
                      variant={template.isActive ? "default" : "outline"}
                      className="text-xs cursor-pointer"
                      onClick={() =>
                        handleToggleActive(template.id, template.isActive)
                      }
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                  {template.systemPrompt}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {template.defaultAutonomyTier}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <Link
                        href={`/dashboard/settings/bees/${template.id}`}
                      >
                        <Settings2 className="size-3.5" />
                      </Link>
                    </Button>
                    {!template.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bee Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Analytics Bee"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as BeeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subtype</Label>
                <Select value={newSubtype} onValueChange={setNewSubtype}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Describe this bee's role and responsibilities..."
                rows={6}
              />
            </div>
            <Button
              onClick={handleCreate}
              className="w-full"
              disabled={createTemplate.isPending}
            >
              {createTemplate.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
