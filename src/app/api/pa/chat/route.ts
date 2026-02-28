import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
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
import { createSwarmSession } from "@/lib/db/queries/swarm-sessions";
import { getSwarmExecutionQueue } from "@/lib/queue";
import type { SwarmExecutionJob } from "@/lib/queue/jobs";
import { db } from "@/lib/db";
import { projects, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getContextForPrompt } from "@/lib/ai/rag";
import { errorResponse } from "@/lib/utils/errors";

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

    // Resolve display names for the current user and all org members
    const memberUserIds = members.map((m) => m.userId);
    const userMetaResults = await Promise.all(
      memberUserIds.map((uid) =>
        supabaseAdmin.auth.admin.getUserById(uid).then((r) => r.data?.user ?? null)
      )
    );

    const userNameMap = new Map<string, string>();
    for (const u of userMetaResults) {
      if (!u) continue;
      const name =
        u.user_metadata?.full_name ||
        u.user_metadata?.display_name ||
        u.email?.split("@")[0] ||
        u.id.slice(0, 8);
      userNameMap.set(u.id, name);
    }

    const currentUserName = userNameMap.get(auth.userId) ?? auth.userId.slice(0, 8);

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
      userName: currentUserName,
      projects: userProjects,
      teamMembers: members.map((m) => ({ id: m.userId, name: userNameMap.get(m.userId) ?? m.userId.slice(0, 8) })),
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
      // ─── Swarm path: enqueue multi-bee execution as a background job ───
      log.info(
        { score: dispatchResult.complexityScore, bees: dispatchResult.selectedBees.length },
        "Dispatching to swarm queue"
      );

      // Pre-create the session so we can return its ID to the client right away.
      // The worker will pick up execution asynchronously.
      const session = await createSwarmSession({
        orgId: auth.orgId,
        userId: auth.userId,
        triggerMessage: message,
        dispatchPlan: dispatchResult,
      });

      swarmSessionId = session.id;
      responseMessage =
        "Your request is being processed by the bee swarm. You can track progress in real-time.";

      // Persist the assistant acknowledgement and interaction counter BEFORE
      // the early return so they are always written, even if the queue is slow.
      await addConversationMessage({
        userId: auth.userId,
        orgId: auth.orgId,
        role: "assistant",
        content: responseMessage,
        metadata: { swarmSessionId },
      });

      await incrementInteractions(auth.userId, auth.orgId, classification.intent);

      // Enqueue the heavy swarm work — the worker picks it up within seconds.
      const swarmJob: SwarmExecutionJob = {
        swarmSessionId,
        userId: auth.userId,
        orgId: auth.orgId,
        triggerMessage: message,
        dispatchPlan: dispatchResult,
        verbosity: paProfile.verbosity,
        formality: paProfile.formality,
      };

      await getSwarmExecutionQueue().add("execute-swarm", swarmJob);

      return Response.json({
        message: responseMessage,
        action: null,
        swarmSessionId,
        intent: classification.intent,
        entities: classification.entities,
        dispatchMode: dispatchResult.mode,
      });
    } else {
      // ─── Direct path: existing PA pipeline ───
      const registry = ACTION_REGISTRY[classification.intent];

      if (!registry) {
        responseMessage = "I'm not sure how to help with that. Could you rephrase your request?";
      } else {
        // Fetch relevant context from embeddings for richer action planning
        let ragContext: string | undefined;
        try {
          ragContext = await getContextForPrompt(auth.orgId, message, { limit: 3 });
          if (ragContext === "No relevant context found.") ragContext = undefined;
        } catch {
          // RAG is best-effort — don't block the pipeline if embeddings table is empty or pgvector isn't ready
          log.warn("RAG context retrieval failed, proceeding without context");
        }

        const plan = await planAction(classification.intent, classification.entities, {
          userName: currentUserName,
          autonomyMode: paProfile.autonomyMode,
          verbosity: paProfile.verbosity,
          formality: paProfile.formality,
          ragContext,
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
    return errorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 50);

    const messages = await getRecentConversations(auth.userId, auth.orgId, limit);

    // Reverse to chronological order (getRecentConversations returns newest first)
    return Response.json({ data: messages.reverse() });
  } catch (error) {
    return errorResponse(error);
  }
}
