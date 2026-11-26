import { activityRedirect } from "@/features/create/history/history-entry";
export function GET(request: Request) { return activityRedirect(request); }
