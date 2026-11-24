import { fiboJobDeadlineMs } from "@/lib/capabilities/generation-job-state-machine";

// Modal's render invocation may run for 420s. Leave another 30s before
// the immutable 20-minute application cutoff. Compute at acceptance time,
// never from updated_at; replay retains its original stored deadline.
export const fiboAdmissionDeadlineMs = fiboJobDeadlineMs - (420 + 30) * 1000;
