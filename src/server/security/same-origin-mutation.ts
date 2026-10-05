import { NextResponse } from "next/server";
import { validateSameOriginMutation } from "@/server/security/same-origin-validation";

export function enforceSameOriginMutation(request: Request) {
  const decision = validateSameOriginMutation(request);
  if (decision.ok) return null;
  return NextResponse.json(decision, { status: 403 });
}
