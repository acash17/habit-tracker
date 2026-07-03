#!/usr/bin/env bash
# Guided end-to-end deploy for the voice-plan backend.
# Runs the two deploys in order, wires the secrets, and verifies the result —
# so you don't have to remember the sequence. Safe to re-run anytime.
#
#   bash scripts/deploy-voice.sh
#
# Prerequisites (install once):
#   - Modal CLI:    pip install modal   &&  modal setup
#   - Supabase CLI: https://supabase.com/docs/guides/cli   &&  supabase login
set -euo pipefail

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

command -v modal    >/dev/null || die "Modal CLI not found. Run: pip install modal && modal setup"
command -v supabase >/dev/null || die "Supabase CLI not found: https://supabase.com/docs/guides/cli"

# ---------------------------------------------------------------------------
say "1/4 · Deploying the Modal GPU backend (uploads code, keeps your weights)…"
modal deploy server/modal/voice_plan_app.py
echo
echo "Look above for the line ending in '.modal.run' — that's your endpoint."
echo "It looks like:  https://<workspace>--cadence-voice-plan-voiceplanner-api.modal.run"
read -r -p "Paste the full https://…modal.run URL here: " MODAL_URL
[ -n "${MODAL_URL:-}" ] || die "No URL entered — re-run when you have it."
MODAL_URL="${MODAL_URL%/}"   # strip any trailing slash

# ---------------------------------------------------------------------------
say "2/4 · Fetching the shared API key from your Modal secret…"
echo "This is the VOICE_API_KEY inside the 'cadence-voice' Modal secret."
read -r -s -p "Paste VOICE_API_KEY (hidden): " MODAL_KEY; echo
[ -n "${MODAL_KEY:-}" ] || die "No key entered. Find it: Modal dashboard → Secrets → cadence-voice."

# ---------------------------------------------------------------------------
say "3/4 · Pointing the Supabase Edge Function at the backend and deploying it…"
supabase secrets set "MODAL_VOICE_URL=$MODAL_URL" "MODAL_VOICE_API_KEY=$MODAL_KEY"
supabase functions deploy voice-plan

# ---------------------------------------------------------------------------
say "4/4 · Verifying the whole chain end-to-end (cold start can take ~60s)…"
MODAL_VOICE_URL="$MODAL_URL" MODAL_VOICE_API_KEY="$MODAL_KEY" bash scripts/voice-backend-check.sh

say "Done. Voice planning is live. If step 4 said 'healthy end-to-end', you're set."
echo "Tip: add MODAL_VOICE_URL and MODAL_VOICE_API_KEY as GitHub repo secrets"
echo "     (Settings → Secrets → Actions) to turn on the daily health check."
