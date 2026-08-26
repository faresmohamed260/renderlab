const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "").trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseServiceRoleKey!);
  headers.set("authorization", `Bearer ${supabaseServiceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase request failed (${response.status})${text ? `: ${text.slice(0, 500)}` : ""}`,
    );
  }

  if (response.status === 204) return null as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
