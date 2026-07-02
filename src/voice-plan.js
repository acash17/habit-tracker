// Voice planning client: records mic audio, sends it to the `voice-plan`
// Edge Function (which fronts the self-hosted Whisper + Qwen backend on
// Modal), and normalises the model's plan into the step shape the planner
// uses everywhere: { label, est, kind, why }.
import { supabase, cloudEnabled } from './supabase.js';

const KINDS = ['body', 'self', 'focus', 'rest'];
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
  rec.start();

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

export async function requestVoicePlan({ audioBlob, text }) {
  if (!cloudEnabled) throw new Error('cloud-disabled');

  const body = {};
  if (text) body.text = text;
  else if (audioBlob) body.audio_b64 = await blobToBase64(audioBlob);
  else throw new Error('nothing to send');

  const { data, error } = await supabase.functions.invoke('voice-plan', { body });
  if (error) throw new Error(error.message || 'voice-plan failed');

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
        est: Number.isFinite(est) ? Math.min(90, Math.max(5, est)) : 25,
        kind: KINDS.includes(s.kind) ? s.kind : 'self',
        why: typeof s.why === 'string' && s.why.trim() ? s.why.trim().slice(0, 160) : 'Fits your flow here.',
      };
    })
    .filter(Boolean)
    .slice(0, 9);
}
