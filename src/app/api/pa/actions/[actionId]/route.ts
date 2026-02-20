import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { actionDecisionSchema } from "@/lib/utils/validation";
import { getPaAction, updatePaAction, createPaCorrection } from "@/lib/db/queries/pa-actions";
import { executeAction } from "@/lib/actions/executor";

interface RouteParams {
  params: Promise<{ actionId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { actionId } = await params;
    const body = await req.json();
    const { decision, editedPayload, rejectionReason } = actionDecisionSchema.parse(body);

    const action = await getPaAction(actionId);
    if (!action) {
      return Response.json({ error: "Action not found" }, { status: 404 });
    }

    if (action.userId !== auth.userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action.status !== "pending") {
      return Response.json({ error: "Action is no longer pending" }, { status: 400 });
    }

    if (decision === "approve") {
      const result = await executeAction(action as any);
      await updatePaAction(actionId, {
        status: result.success ? "executed" : "failed",
        executedPayload: action.plannedPayload as any,
        executionResult: result as any,
        approvedAt: new Date(),
        executedAt: new Date(),
      });
      return Response.json({ status: result.success ? "executed" : "failed", result });
    }

    if (decision === "edit") {
      if (!editedPayload) {
        return Response.json({ error: "editedPayload is required for edit" }, { status: 400 });
      }
      const editedAction = { ...action, userEditedPayload: editedPayload } as any;
      const result = await executeAction(editedAction);
      await updatePaAction(actionId, {
        status: result.success ? "executed" : "failed",
        userEditedPayload: editedPayload,
        executedPayload: editedPayload as any,
        executionResult: result as any,
        approvedAt: new Date(),
        executedAt: new Date(),
      });
      await createPaCorrection({
        userId: auth.userId,
        orgId: auth.orgId,
        actionId,
        originalOutput: JSON.stringify(action.plannedPayload),
        correctedOutput: JSON.stringify(editedPayload),
        correctionType: "edit",
      });
      return Response.json({ status: result.success ? "executed" : "failed", result });
    }

    // reject
    await updatePaAction(actionId, {
      status: "rejected",
      rejectionReason,
    });
    await createPaCorrection({
      userId: auth.userId,
      orgId: auth.orgId,
      actionId,
      originalOutput: JSON.stringify(action.plannedPayload),
      correctedOutput: rejectionReason ?? "rejected",
      correctionType: "rejection",
    });
    return Response.json({ status: "rejected" });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PA action decision error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
