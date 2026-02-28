import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { sendMessage } from "@/lib/integrations/slack";
import { errorResponse } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const result = await sendMessage(auth.userId, auth.orgId, body);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
