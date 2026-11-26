import { activityRedirect } from "../../../features/create/history/history-entry.ts";

export const dynamic = "force-dynamic";
export function GET(request: Request) { return activityRedirect(request); }
