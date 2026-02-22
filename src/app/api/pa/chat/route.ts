import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { paChatSchema } from "@/lib/utils/validation";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { planAction } from "@/lib/ai/action-planner";
import { executeAction } from "@/lib/actions/executor";
import { resolveActionTier, ACTION_REGISTRY } from "@/lib/actions/registry";
import { getOrCreatePaProfile, incrementInteractions } from "@/lib/db/queries/pa-profiles";
import {
  createPaAction,
  updatePaAction,
  addConversationMessage,
  getRecentConversations,
} from "@/lib/db/queries/pa-actions";
import { getTasks } from "@/lib/db/queries/tasks";
import { dispatch } from "@/lib/bees/dispatcher";
import { executeSwarm } from "@/lib/bees/swarm-executor";
import { db } from "@/lib/db";
import { projects, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("pa-chat");

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`pa:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = paChatSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { message, voiceTranscriptId } = parsed.data;

    // Load context
    const paProfile = await getOrCreatePaProfile(auth.userId, auth.orgId);

    const [userProjects, members, recentTasksResult, recentMessages] = await Promise.all([
      db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.orgId, auth.orgId)),
      db.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.orgId, auth.orgId)),
      getTasks({ orgId: auth.orgId, assigneeId: auth.userId, limit: 10 }),
      getRecentConversations(auth.userId, auth.orgId, 10),
    ]);

    // Store user message
    await addConversationMessage({
      userId: auth.userId,
      orgId: auth.orgId,
      role: "user",
      content: message,
      metadata: voiceTranscriptId ? { voiceTranscriptId } : undefined,
    });

    // Classify intent
    const classification = await classifyIntent(message, {
      userName: auth.userId,
      projects: userProjects,
      teamMembers: members.map((m) => ({ id: m.userId, name: m.userId })),
      recentTasks: recentTasksResult.data.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
      })),
    });

    // ─── Bee Dispatcher: assess complexity and choose path ───
    const dispatchResult = await dispatch({
      message,
      intent: classification.intent,
      entities: classification.entities,
      orgId: auth.orgId,
    });

    let responseMessage: string;
    let action = null;
    let swarmSessionId: string | null = null;

    if (dispatchResult.mode === "swarm") {
      // ─── Swarm path: multi-bee execution ───
      log.info(
        { score: dispatchResult.complexityScore, bees: dispatchResult.selectedBees.length },
        "Dispatching to swarm"
      );

      const swarmResult = await executeSwarm({
        orgId: auth.orgId,
        userId: auth.userId,
        triggerMessage: message,
        dispatchPlan: dispatchResult,
        verbosity: paProfile.verbosity,
        formality: paProfile.formality,
      });

      responseMessage = swarmResult.synthesizedResponse;
      swarmSessionId = swarmResult.swarmSessionId;
    } else {
      // ─── Direct path: existing PA pipeline (unchanged) ───
      const registry = ACTION_REGISTRY[classification.intent];

      if (!registry) {
        responseMessage = "I'm not sure how to help with that. Could you rephrase your request?";
      } else {
        const plan = await planAction(classification.intent, classification.entities, {
          userName: auth.userId,
          autonomyMode: paProfile.autonomyMode,
          verbosity: paProfile.verbosity,
          formality: paProfile.formality,
        });

        const tier = resolveActionTier(classification.intent, paProfile, {
          assigneeId: classification.entities.assigneeId,
          userId: auth.userId,
        });

        if (tier === "auto_execute" || tier === "execute_notify") {
          const paAction = await createPaAction({
            userId: auth.userId,
            orgId: auth.orgId,
            actionType: classification.intent,
            tier,
            plannedPayload: plan.payload,
          });

          const result = await executeAction({ ...paAction } as any);

          await updatePaAction(paAction.id, {
            status: result.success ? "executed" : "failed",
            executedPayload: plan.payload,
            executionResult: result as any,
            executedAt: new Date(),
          });

          action = { ...paAction, status: result.success ? "executed" : "failed", executionResult: result };
          responseMessage = result.success
            ? plan.confirmationMessage
            : `I couldn't complete that: ${result.error}`;
        } else if (tier === "draft_approve") {
          const paAction = await createPaAction({
            userId: auth.userId,
            orgId: auth.orgId,
            actionType: classification.intent,
            tier,
            plannedPayload: plan.payload,
          });

          action = paAction;
          responseMessage = plan.draftPreview
            ? `Here's what I'd like to do:\n\n${plan.draftPreview}\n\nShall I go ahead?`
            : plan.confirmationMessage;
        } else {
          responseMessage = plan.confirmationMessage;
        }
      }
    }

    // Store assistant response
    await addConversationMessage({
      userId: auth.userId,
      orgId: auth.orgId,
      role: "assistant",
      content: responseMessage,
      metadata: {
        ...(action ? { actionId: action.id } : {}),
        ...(swarmSessionId ? { swarmSessionId } : {}),
      },
    });

    // Update interaction stats
    await incrementInteractions(auth.userId, auth.orgId, classification.intent);

    return Response.json({
      message: responseMessage,
      action,
      swarmSessionId,
      intent: classification.intent,
      entities: classification.entities,
      dispatchMode: dispatchResult.mode,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "PA chat error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
