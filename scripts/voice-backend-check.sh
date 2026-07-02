#!/usr/bin/env bash
# End-to-end health check for the voice-plan backend (Modal GPU endpoint).
#
# Usage:
#   MODAL_VOICE_URL=https://<workspace>--cadence-voice-plan-voiceplanner-api.modal.run \
#   MODAL_VOICE_API_KEY=<key> \
#   scripts/voice-backend-check.sh
#
# Exit 0 = healthy end-to-end. Non-zero = which layer failed is printed.
# Note: a cold container takes ~30-60s to boot; this script waits up to 3 min.
set -u

: "${MODAL_VOICE_URL:?set MODAL_VOICE_URL (Modal endpoint, no trailing slash)}"
: "${MODAL_VOICE_API_KEY:?set MODAL_VOICE_API_KEY (same value as the Modal secret)}"

echo "1/2 · /healthz (boots the container — cold start can take ~60s)…"
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 180 "$MODAL_VOICE_URL/healthz") || code=000
if [ "$code" != "200" ]; then
  echo "FAIL: /healthz returned $code"
  echo "  000       → endpoint unreachable: app not deployed, wrong URL, or Modal credits exhausted"
  echo "  5xx/hang  → container crash-looping: check 'modal app logs cadence-voice-plan'"
  exit 1
fi
echo "     ok — container boots and models are loaded"

echo "2/2 · /plan with a text prompt (exercises Qwen via vLLM)…"
resp=$(curl -sS --max-time 120 -X POST "$MODAL_VOICE_URL/plan" \
  -H "content-type: application/json" -H "x-api-key: $MODAL_VOICE_API_KEY" \
  -d '{"text": "gym, two hours of deep work, lunch, emails, medium energy, four hours free"}')
if echo "$resp" | grep -q '"steps"'; then
  echo "     ok — plan generated:"
  echo "$resp" | head -c 400; echo
  echo "Voice backend healthy end-to-end."
else
  echo "FAIL: /plan did not return a plan. Response:"
  echo "$resp" | head -c 600; echo
  echo "  401 → API key mismatch between Supabase secret and Modal secret"
  echo "  422 → model/transcription issue; see 'modal app logs cadence-voice-plan'"
  exit 1
fi
