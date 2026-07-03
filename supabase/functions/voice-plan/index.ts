// voice-plan — JWT-verified gateway between the app and the Modal GPU endpoint.
// The Modal URL + API key stay server-side (Supabase secrets); clients only
// ever hold their own Supabase session token.
//
// Secrets required:
//   supabase secrets set MODAL_VOICE_URL=https://...modal.run MODAL_VOICE_API_KEY=...

import { createClient } from "jsr:@supabase/supabase-js@2";

const MODAL_URL = Deno.env.get("MODAL_VOICE_URL");
const MODAL_KEY = Deno.env.get("MODAL_VOICE_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  if (!MODAL_URL || !MODAL_KEY) {
    return json({ error: "not-configured", detail: "MODAL_VOICE_URL / MODAL_VOICE_API_KEY secrets missing" }, 500);
  }

  // Verify the caller is a signed-in Cadence user.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  let body: { audio_b64?: string; text?: string; warmup?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  // Warm-up ping: the app fires this when the voice sheet opens so the GPU
  // container cold-starts while the user is still talking. /healthz only
  // resolves once the models are loaded, so a 200 here means "ready".
  if (body.warmup) {
    const health = await fetch(`${MODAL_URL}/healthz`, {
      signal: AbortSignal.timeout(110_000),
    }).catch(() => null);
    return json({ ok: !!health?.ok }, health?.ok ? 200 : 504);
  }

  if (!body.audio_b64 && !body.text) {
    return json({ error: "audio_b64 or text required" }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${MODAL_URL}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": MODAL_KEY },
      body: JSON.stringify({ audio_b64: body.audio_b64, text: body.text }),
      // Cold starts on the GPU container can take ~60s; Edge Functions allow it.
      signal: AbortSignal.timeout(110_000),
    });
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    // Full error (may contain the Modal URL) goes to function logs only —
    // clients get a generic detail so the secret endpoint never leaks.
    if (!timedOut) console.error("voice-plan: backend unreachable:", e);
    return json(
      timedOut
        ? { error: "backend-timeout", detail: "inference backend timed out — likely a cold start" }
        : { error: "backend-unreachable", detail: "could not reach inference backend" },
      timedOut ? 504 : 502,
    );
  }

  const payload = await upstream.text();
  return new Response(payload, {
    status: upstream.status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
