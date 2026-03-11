import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/providers";
import { createOrganization } from "@/lib/db/queries/organizations";
import { createProject } from "@/lib/db/queries/projects";
import { createTask } from "@/lib/db/queries/tasks";
import { createItem } from "@/lib/db/queries/items";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse } from "@/lib/utils/errors";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger("pa-onboard");

const onboardSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  orgId: z.string().uuid().nullish(),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const SYSTEM_PROMPT = `You are the Hive onboarding assistant. Your job is to warmly welcome new users and set up their workspace through natural conversation.

You must extract the following during the conversation:
1. Organization/team name (REQUIRED)
2. What kind of work they do (to infer pathway: "boards" for visual/design/marketing teams, "lists" for engineering/ops teams, "workspace" for mixed/general teams)
3. Team size and context (nice to have, not blocking)

Guidelines:
- Be warm, concise, and professional. No emojis.
- Ask ONE question at a time.
- Your first message should ask for their team/company name.
- After getting the name, ask about what kind of projects they work on.
- After 2-3 meaningful exchanges, wrap up and tell them their workspace is ready.
- Do NOT ask about tools, integrations, or features — keep it simple.

When you have enough information, respond with your message AND include a JSON block at the very end of your response in this exact format:

\`\`\`json
{"orgName": "...", "pathway": "boards|lists|workspace", "setupComplete": true}
\`\`\`

Only include the JSON block when you have at least the org name and can infer a pathway. The JSON block should be the LAST thing in your response.

If the user hasn't provided enough info yet, just respond conversationally without the JSON block.`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimit(`onboard:${user.id}`, 30, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = onboardSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, orgId } = parsed.data;

    // Build conversation for AI
    const aiMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await chatCompletion("planner", {
      messages: aiMessages,
      temperature: 0.7,
      maxTokens: 512,
    });

    // Check if the AI included setup data
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    let setupComplete = false;
    let resultOrgId = orgId ?? null;
    let cleanMessage = response;

    if (jsonMatch) {
      try {
        const setupData = JSON.parse(jsonMatch[1]);
        cleanMessage = response
          .replace(/```json\s*\{[\s\S]*?\}\s*```/, "")
          .trim();

        if (setupData.setupComplete && setupData.orgName) {
          // Create the org if we haven't yet
          if (!resultOrgId) {
            try {
              const org = await createOrganization({
                name: setupData.orgName,
                slug: slugify(setupData.orgName),
                userId: user.id,
              });
              resultOrgId = org.id;
              log.info(
                { orgId: org.id, orgName: setupData.orgName },
                "Onboarding created org"
              );
            } catch (orgErr) {
              log.error({ err: orgErr }, "Failed to create org during onboard");
              // If slug collision, try with a random suffix
              const org = await createOrganization({
                name: setupData.orgName,
                slug:
                  slugify(setupData.orgName) +
                  "-" +
                  Math.random().toString(36).slice(2, 6),
                userId: user.id,
              });
              resultOrgId = org.id;
            }
          }

          // Set pathway
          if (resultOrgId && setupData.pathway) {
            const validPathways = ["boards", "lists", "workspace"] as const;
            const pathway = validPathways.includes(setupData.pathway)
              ? setupData.pathway
              : "boards";

            await db
              .update(organizations)
              .set({ pathway, updatedAt: new Date() })
              .where(eq(organizations.id, resultOrgId));
          }

          // Seed demo project for new org
          try {
            const demoProject = await createProject({
              orgId: resultOrgId!,
              name: "Getting Started with Hive",
              description: "Your first project! Explore Hive's features by working through these tasks.",
              createdBy: user.id,
              memberIds: [user.id],
            });

            await createItem({
              orgId: resultOrgId!,
              projectId: demoProject.id,
              type: "project",
              title: demoProject.name,
              ownerId: user.id,
              status: demoProject.status,
              sourceId: demoProject.id,
            }).catch(() => {});

            const demoTasks = [
              { title: "Explore your dashboard", description: "Take a look around the dashboard to see your projects, tasks, and activity.", status: "in_progress" as const, priority: "high" as const },
              { title: "Create your first task", description: "Try creating a new task in this project. Click the + button or use the PA.", status: "todo" as const, priority: "medium" as const },
              { title: "Try the PA assistant", description: "Open the PA chat and ask it to help you manage tasks. Try saying 'create a task' or 'what should I do next?'", status: "todo" as const, priority: "medium" as const },
              { title: "Invite team members", description: "Go to Team settings and invite your colleagues to collaborate.", status: "todo" as const, priority: "low" as const },
              { title: "Connect integrations", description: "Link Google Calendar, Microsoft Outlook, or Slack in the Integrations page.", status: "todo" as const, priority: "low" as const },
              { title: "Set up your PA preferences", description: "Customize your Personal Assistant in Settings > Profile.", status: "todo" as const, priority: "low" as const },
            ];

            for (const dt of demoTasks) {
              const task = await createTask({
                projectId: demoProject.id,
                orgId: resultOrgId!,
                title: dt.title,
                description: dt.description,
                status: dt.status,
                priority: dt.priority,
                assigneeId: user.id,
                createdBy: user.id,
              });
              await createItem({
                orgId: resultOrgId!,
                projectId: demoProject.id,
                type: "task",
                title: task.title,
                ownerId: user.id,
                status: task.status,
                sourceId: task.id,
              }).catch(() => {});
            }

            log.info({ orgId: resultOrgId, projectId: demoProject.id }, "Demo project seeded");
          } catch (seedErr) {
            log.error({ err: seedErr }, "Failed to seed demo project (non-blocking)");
          }

          setupComplete = true;
        }
      } catch {
        // JSON parse failed — just return the message as-is
        log.warn("Failed to parse onboarding setup JSON from AI response");
      }
    }

    return Response.json({
      message: cleanMessage,
      setupComplete,
      orgId: resultOrgId,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
