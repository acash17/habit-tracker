// Voice planning client: records mic audio, sends it to the `voice-plan`
// Edge Function (which fronts the self-hosted Whisper + Qwen backend on
// Modal), and normalises the model's plan into the step shape the planner
// uses everywhere: { label, est, kind, why }.
import { supabase, cloudEnabled } from './supabase.js';

const KINDS = ['body', 'self', 'focus', 'rest'];
// Upper bound on a single step's minutes. Kept generous so full-day routine
// anchors — a night's sleep (~480), a long workout — survive normalisation,
// while still rejecting nonsense (a step can't be longer than a day).
const MAX_EST = 600;
const MAX_RECORD_MS = 60_000;

export const voicePlanEnabled = cloudEnabled;

// ---------- recording ----------

// Starts capturing mic audio. Returns { stop, cancel }; stop() resolves with
// a Blob. Prefers a mime type the webview supports (webm on Android/desktop,
// mp4 on iOS) — the backend decodes either.
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  // Timeslice: emit a chunk every 250ms so audio is collected continuously.
  // Without it, some webviews only flush on stop() and can drop the tail of
  // the recording — losing the end of what the user said.
  rec.start(250);

  const cleanup = () => stream.getTracks().forEach((t) => t.stop());
  const timeout = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_RECORD_MS);

  const done = new Promise((resolve) => {
    rec.onstop = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
  });

  return {
    stop() { if (rec.state === 'recording') rec.stop(); return done; },
    cancel() { clearTimeout(timeout); if (rec.state === 'recording') rec.stop(); cleanup(); },
  };
}

// ---------- backend call ----------

// Cold-start absorber: the GPU container scales to zero when idle and takes
// ~30-60s to boot. Pinging it the moment the voice sheet opens means it's
// warm (or warming) by the time the user finishes talking. Resolves true once
// the backend reports healthy (models loaded), so requestVoicePlan can await
// it before retrying a request that lost the cold-start race. Never rejects.
let warm = null; // { promise, pending, at }
export function warmVoiceBackend() {
  if (!cloudEnabled) return Promise.resolve(false);
  if (warm && (warm.pending || Date.now() - warm.at < 120_000)) return warm.promise;
  const entry = { pending: true, at: Date.now() };
  entry.promise = supabase.functions
    .invoke('voice-plan', { body: { warmup: true } })
    .then(({ error }) => !error)
    .catch(() => false)
    .then((ok) => {
      entry.pending = false;
      entry.at = Date.now();
      if (!ok) warm = null; // failed warmups aren't cached — next call tries again
      return ok;
    });
  warm = entry;
  return entry.promise;
}

// Turns a supabase.functions.invoke error into an Error whose message is a
// stable code the UI can map to a specific explanation. invoke() collapses
// every non-2xx into one generic message, so read the real status/body from
// error.context (the fetch Response).
export async function classifyVoicePlanError(error) {
  let status = 0;
  let detail = '';
  try {
    const res = error?.context;
    if (res && typeof res.status === 'number') {
      status = res.status;
      const body = await res.json();
      detail = body?.detail || body?.error || '';
    }
  } catch { /* body unreadable — fall through to generic */ }
  if (status === 422) return new Error('empty-plan');          // backend heard nothing usable
  if (status === 504) return new Error('backend-warming');     // cold start outran the gateway timeout
  if (status === 401) return new Error('unauthorized');        // session expired
  const err = new Error('voice-plan-failed');
  err.detail = detail || error?.message || '';
  return err;
}

export async function requestVoicePlan({ audioBlob, text, onRetry }) {
  if (!cloudEnabled) throw new Error('cloud-disabled');

  const body = {};
  if (text) body.text = text;
  else if (audioBlob) body.audio_b64 = await blobToBase64(audioBlob);
  else throw new Error('nothing to send');

  let { data, error } = await supabase.functions.invoke('voice-plan', { body });
  if (error) {
    const err = await classifyVoicePlanError(error);
    if (err.message !== 'backend-warming') throw err;
    // Lost the cold-start race. Wait for the backend to finish booting
    // (warmup resolves once /healthz answers), then retry the same audio once
    // instead of surfacing an error the user can only respond to by retrying.
    // If the health probe says the backend is down (not merely booting),
    // fail now — the retry would just burn another timeout.
    onRetry?.();
    const healthy = await warmVoiceBackend();
    if (!healthy) throw err;
    ({ data, error } = await supabase.functions.invoke('voice-plan', { body }));
    if (error) throw await classifyVoicePlanError(error);
  }

  const steps = normalizeSteps(data?.plan?.steps);
  if (!steps.length) throw new Error('empty-plan');
  return {
    transcript: data.transcript || '',
    title: typeof data?.plan?.title === 'string' && data.plan.title.trim()
      ? data.plan.title.trim() : 'Voice plan',
    steps,
  };
}

async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

// ---------- plan validation ----------

// The model is prompted to emit strict JSON, but never trust it: coerce every
// step into { label, est, kind, why } and drop anything unusable.
export function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const label = typeof s.label === 'string' ? s.label.trim() : '';
      if (!label) return null;
      const est = Math.round(Number(s.est));
      return {
        label: label.slice(0, 80),
        est: Number.isFinite(est) ? Math.min(MAX_EST, Math.max(5, est)) : 25,
        kind: KINDS.includes(s.kind) ? s.kind : 'self',
        why: typeof s.why === 'string' && s.why.trim() ? s.why.trim().slice(0, 160) : 'Fits your flow here.',
      };
    })
    .filter(Boolean)
    .slice(0, 9);
}
