# Cadence voice-plan backend (Modal)

Self-hosted open-source inference for the voice planner:

- **STT** — faster-whisper `small` (int8) on GPU
- **LLM** — `Qwen/Qwen2.5-7B-Instruct-AWQ` served by vLLM (continuous batching,
  handles ~14 concurrent users on one L4)
- **Hosting** — [Modal](https://modal.com), one L4 GPU container that scales to
  zero when idle. The free Starter plan's **$30/month credits ≈ 37 L4-hours**,
  which covers a testing phase at $0 out of pocket.

Model weights live in a Modal Volume in *your* workspace; user audio never
touches a third-party inference API. Supabase (auth + RLS) fronts this — the
endpoint only accepts requests carrying the shared secret.

## One-time setup (~10 minutes)

```bash
pip install modal
modal setup                       # opens browser, creates free account

# shared secret between the Supabase Edge Function and this endpoint
modal secret create cadence-voice VOICE_API_KEY=$(openssl rand -hex 32)

# downloads Qwen (~5.5GB) + Whisper into a Modal Volume, then deploys
modal run    server/modal/voice_plan_app.py     # weights download (one time)
modal deploy server/modal/voice_plan_app.py
```

The deploy prints your endpoint URL, e.g.
`https://<workspace>--cadence-voice-plan-voiceplanner-api.modal.run`

## Wire it to Supabase

```bash
supabase secrets set \
  MODAL_VOICE_URL=https://<your-endpoint>.modal.run \
  MODAL_VOICE_API_KEY=<the same value you put in the modal secret>

supabase functions deploy voice-plan
```

## API

`POST /plan` with header `x-api-key` and JSON body:

```json
{ "audio_b64": "<base64 audio (webm/mp4/wav)>" }   // or { "text": "plan my day ..." }
```

Response:

```json
{ "transcript": "...", "plan": { "title": "...", "steps": [ { "label": "...", "est": 20, "kind": "focus", "why": "..." } ] } }
```

## Cost behaviour

- Idle (no requests for 5 min) → container stops → **$0**.
- Cold start after idle is ~30–60s for the first request. The app fires a
  warm-up ping the moment the voice sheet opens, so the container boots while
  the user is still talking; for a scheduled test session you can also warm it
  manually with `curl <endpoint>/healthz`.
- Never set `min_containers=1` and walk away — that is the only way this
  costs real money (~$0.80/hr, 24/7 ≈ $580/mo).

## When "Planning service unavailable" persists

A one-off failure is usually a cold start; a failure lasting 10+ minutes is an
outage. Run the end-to-end probe first — it tells you which layer is broken:

```bash
MODAL_VOICE_URL=https://<endpoint>.modal.run \
MODAL_VOICE_API_KEY=<key> \
scripts/voice-backend-check.sh
```

Then check, in order of likelihood:

1. **Modal credits exhausted** — the free plan's $30/month runs ~37 L4-hours;
   when it's gone, Modal stops serving the app entirely until the cycle resets
   or a payment method is added. Check the Modal dashboard → Usage.
2. **Container crash-looping** — `modal app logs cadence-voice-plan`. The app
   now self-heals an empty weights volume on first boot (downloads once and
   commits), so the classic cause — a skipped `modal run` weights step making
   every cold start re-download 5.5GB and die — fixes itself after one slow boot.
3. **Stale Supabase secrets** — after any `modal deploy` that changes the URL,
   re-run `supabase secrets set MODAL_VOICE_URL=...` and redeploy the Edge
   Function. `supabase secrets list` to verify.

The GitHub Action `.github/workflows/voice-backend-health.yml` runs the same
probe daily and fails loudly, so an outage is caught within a day instead of
by a user mid-recording (set the `MODAL_VOICE_URL` / `MODAL_VOICE_API_KEY`
repo secrets to enable it).
