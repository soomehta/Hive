import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { paChatSchema } from "@/lib/utils/validation";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { planAction } from "@/lib/ai/action-planner";
import { executeAction } from "@/lib/actions/executor";
import { resolveActionTier, ACTION_REGISTRY, normalizeIntent } from "@/lib/actions/registry";
import { getOrCreatePaProfile, incrementInteractions } from "@/lib/db/queries/pa-profiles";
import {
  createPaAction,
  updatePaAction,
  addConversationMessage,
  getRecentConversations,
  createChatSession,
  getChatSession,
} from "@/lib/db/queries/pa-actions";
import { getTasks } from "@/lib/db/queries/tasks";
import { getChannels } from "@/lib/db/queries/chat";
import { items as itemsTable } from "@/lib/db/schema";
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
import { getCachedUserNames, setCachedUserNames } from "@/lib/cache/user-names";

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
    const { message, voiceTranscriptId, sessionId: requestedSessionId } = parsed.data;

    // Resolve or create chat session
    let sessionId: string;
    if (requestedSessionId) {
      const session = await getChatSession(requestedSessionId);
      if (!session || session.userId !== auth.userId || session.orgId !== auth.orgId) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      sessionId = session.id;
    } else {
      // Auto-create a new session titled with the first message
      const title = message.length > 80 ? message.slice(0, 77) + "..." : message;
      const session = await createChatSession({
        userId: auth.userId,
        orgId: auth.orgId,
        title,
      });
      sessionId = session.id;
    }

    // Load context
    const paProfile = await getOrCreatePaProfile(auth.userId, auth.orgId);

    const [userProjects, members, recentTasksResult, recentMessages] = await Promise.all([
      db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.orgId, auth.orgId)),
      db.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.orgId, auth.orgId)),
      getTasks({ orgId: auth.orgId, assigneeId: auth.userId, limit: 10 }),
      getRecentConversations(auth.userId, auth.orgId, 10),
    ]);

    // Resolve display names for the current user and all org members (cached)
    const memberUserIds = members.map((m) => m.userId);
    let userNameMap = getCachedUserNames(auth.orgId);

    if (!userNameMap) {
      const userMetaResults = await Promise.all(
        memberUserIds.map((uid) =>
          supabaseAdmin.auth.admin.getUserById(uid).then((r) => r.data?.user ?? null)
        )
      );

      userNameMap = new Map<string, string>();
      for (const u of userMetaResults) {
        if (!u) continue;
        const name =
          u.user_metadata?.full_name ||
          u.user_metadata?.display_name ||
          u.email?.split("@")[0] ||
          u.id.slice(0, 8);
        userNameMap.set(u.id, name);
      }
      setCachedUserNames(auth.orgId, userNameMap);
    }

    const currentUserName = userNameMap.get(auth.userId) ?? auth.userId.slice(0, 8);

    // Store user message
    await addConversationMessage({
      userId: auth.userId,
      orgId: auth.orgId,
      sessionId,
      role: "user",
      content: message,
      metadata: voiceTranscriptId ? { voiceTranscriptId } : undefined,
    });

    // Build conversation history for multi-turn context
    const conversationHistory = recentMessages
      .filter((m): m is typeof m & { role: string; content: string } => !!m.role && !!m.content)
      .map((m) => ({ role: m.role, content: m.content }));

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
      conversationHistory,
    });

    // ─── Bee Dispatcher: assess complexity and choose path ───
    const dispatchResult = await dispatch({
      message,
      intent: classification.intent,
      entities: classification.entities,
      orgId: auth.orgId,
    });

    let responseMessage = "";
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
        sessionId,
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

      await getSwarmExecutionQueue().add("execute-swarm", swarmJob, {
        jobId: `swarm-exec:${swarmSessionId}`,
      });

      return Response.json({
        message: responseMessage,
        action: null,
        sessionId,
        swarmSessionId,
        intent: classification.intent,
        entities: classification.entities,
        dispatchMode: dispatchResult.mode,
      });
    } else {
      // ─── Direct path: existing PA pipeline ───
      // Normalize intent (handles hyphens, casing, typos)
      const normalizedIntent = normalizeIntent(classification.intent);
      const registry = normalizedIntent ? ACTION_REGISTRY[normalizedIntent] : undefined;

      let skipPlanning = false;

      if (!registry) {
        responseMessage = "I'm not sure how to help with that. Could you rephrase your request?";
        skipPlanning = true;
      } else if (classification.confidence < 0.4) {
        // Low confidence — ask for clarification instead of executing
        responseMessage = "I'm not quite sure what you'd like me to do. Could you rephrase or provide more detail?";
        log.info({ confidence: classification.confidence, intent: classification.intent }, "Low confidence, requesting clarification");
        skipPlanning = true;
      } else if (registry.requiresIntegration) {
        // Check if user has the required integration connected
        const { getUserIntegrations } = await import("@/lib/db/queries/integrations");
        const userIntegrations = await getUserIntegrations(auth.userId, auth.orgId);
        const requiredProvider = registry.requiresIntegration;
        const hasIntegration = userIntegrations.some(
          (i) => (i.provider === requiredProvider || i.provider === "microsoft") && i.isActive
        );
        if (!hasIntegration) {
          responseMessage = `This action requires a ${requiredProvider === "google" ? "Google or Microsoft" : requiredProvider} integration. Connect it in Settings > Integrations to use this feature.`;
          skipPlanning = true;
        }
      }

      if (!skipPlanning && registry) {
        try {
          // Fetch relevant context from embeddings for richer action planning
          let ragContext: string | undefined;
          try {
            ragContext = await getContextForPrompt(auth.orgId, message, { limit: 3 });
            if (ragContext === "No relevant context found.") ragContext = undefined;
          } catch {
            // RAG is best-effort — don't block the pipeline if embeddings table is empty or pgvector isn't ready
            log.warn("RAG context retrieval failed, proceeding without context");
          }

          // Fetch channels and pages context for Phase 6 intents
          let channelsCtx: Array<{ id: string; name: string; scope: string }> = [];
          let pagesCtx: Array<{ itemId: string; title: string }> = [];
          try {
            const [channels, pageItems] = await Promise.all([
              getChannels(auth.orgId),
              db
                .select({ itemId: itemsTable.id, title: itemsTable.title })
                .from(itemsTable)
                .where(eq(itemsTable.orgId, auth.orgId))
                .limit(30),
            ]);
            channelsCtx = channels.map((c) => ({ id: c.id, name: c.name, scope: c.scope }));
            pagesCtx = pageItems;
          } catch {
            log.warn("Failed to fetch channels/pages context for planner");
          }

          const plan = await planAction(normalizedIntent!, classification.entities, {
            userName: currentUserName,
            autonomyMode: paProfile.autonomyMode,
            verbosity: paProfile.verbosity,
            formality: paProfile.formality,
            personalityTraits: paProfile.personalityTraits ?? undefined,
            ragContext,
            conversationHistory,
            channels: channelsCtx,
            pages: pagesCtx,
          });

          const tier = resolveActionTier(normalizedIntent!, paProfile, {
            assigneeId: classification.entities.assigneeId,
            userId: auth.userId,
          });

          if (tier === "auto_execute" || tier === "execute_notify") {
            const paAction = await createPaAction({
              userId: auth.userId,
              orgId: auth.orgId,
              actionType: normalizedIntent!,
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
              actionType: normalizedIntent!,
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
        } catch (pipelineErr) {
          log.error({ err: pipelineErr, intent: normalizedIntent }, "PA pipeline failed");
          const errMsg = pipelineErr instanceof Error ? pipelineErr.message : "Unknown error";

          // Return a user-friendly error as a chat message instead of a 500
          if (errMsg.includes("environment variable is not set")) {
            responseMessage = "I'm unable to process that right now — an AI service is not configured. Please contact your administrator.";
          } else if (errMsg.includes("Failed to parse AI response")) {
            responseMessage = "I had trouble understanding the AI response. Could you try rephrasing your request?";
          } else {
            responseMessage = "I ran into an issue processing your request. Please try again in a moment.";
          }
        }
      }
    }

    // Store assistant response
    await addConversationMessage({
      userId: auth.userId,
      orgId: auth.orgId,
      sessionId,
      role: "assistant",
      content: responseMessage,
      metadata: {
        ...(action ? { actionId: action.id } : {}),
        ...(swarmSessionId ? { swarmSessionId } : {}),
      },
    });

    await incrementInteractions(auth.userId, auth.orgId, classification.intent);

    // Check if client wants streaming
    const acceptsStream = req.headers.get("accept")?.includes("text/event-stream");

    if (!acceptsStream) {
      // Non-streaming response (backward compatible)
      return Response.json({
        message: responseMessage,
        action,
        sessionId,
        swarmSessionId,
        intent: classification.intent,
        entities: classification.entities,
        dispatchMode: dispatchResult.mode,
      });
    }

    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Stream text in chunks to simulate progressive rendering
        const words = responseMessage.split(" ");
        let accumulated = "";
        const chunkSize = 3; // Send 3 words at a time

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(" ");
          accumulated += (accumulated ? " " : "") + chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text", content: accumulated })}\n\n`)
          );
        }

        // Stream action if present
        if (action) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "action", action })}\n\n`)
          );
        }

        // Stream metadata
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "done",
            sessionId,
            swarmSessionId,
            intent: classification.intent,
            entities: classification.entities,
            dispatchMode: dispatchResult.mode,
          })}\n\n`)
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
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
