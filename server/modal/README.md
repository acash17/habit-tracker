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
- Cold start after idle is ~30–60s for the first request; during a scheduled
  test session, warm it first with `curl <endpoint>/healthz`.
- Never set `min_containers=1` and walk away — that is the only way this
  costs real money (~$0.80/hr, 24/7 ≈ $580/mo).
