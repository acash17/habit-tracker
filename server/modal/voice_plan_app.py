# Cadence voice-plan backend — Modal serverless GPU app.
#
# One L4 GPU container runs both models:
#   - faster-whisper (small, int8) for speech-to-text
#   - Qwen2.5-7B-Instruct-AWQ served by vLLM (OpenAI-compatible, continuous
#     batching) for transcript -> day-plan JSON
#
# Deploy:   modal deploy server/modal/voice_plan_app.py
# Weights download once into a Modal Volume during the first deploy, then the
# container scales to zero between requests (idle == $0, free $30/mo credits
# cover ~37 L4-hours of actual use).
#
# Auth: every request must carry `x-api-key` matching the VOICE_API_KEY value
# in the Modal secret `cadence-voice`:
#   modal secret create cadence-voice VOICE_API_KEY=<long-random-string>

import base64
import json
import os
import re
import subprocess
import tempfile
import time
import urllib.request

import modal

APP_NAME = "cadence-voice-plan"
LLM_MODEL = "Qwen/Qwen2.5-7B-Instruct-AWQ"
WHISPER_MODEL = "small"
VLLM_PORT = 8001
MAX_AUDIO_BYTES = 8 * 1024 * 1024  # ~60s of opus is well under this

volume = modal.Volume.from_name("cadence-model-weights", create_if_missing=True)
MODELS_DIR = "/models"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "vllm==0.8.5",
        "faster-whisper==1.1.1",
        "fastapi[standard]==0.115.12",
        "huggingface_hub==0.30.2",
    )
    .env({"HF_HOME": MODELS_DIR, "VLLM_USE_V1": "1"})
)

app = modal.App(APP_NAME)


@app.function(image=image, volumes={MODELS_DIR: volume}, timeout=60 * 30)
def download_weights():
    """Pull both models into the shared volume once, at deploy time."""
    from faster_whisper import download_model
    from huggingface_hub import snapshot_download

    snapshot_download(LLM_MODEL)
    download_model(WHISPER_MODEL, cache_dir=os.path.join(MODELS_DIR, "whisper"))
    volume.commit()
    print("weights ready")


SYSTEM_PROMPT = """You turn a spoken description of someone's day into an ordered plan.
Reply with ONLY a JSON object, no prose, shaped exactly like:
{"title": "short plan title",
 "steps": [{"label": "20-min gym (low-rep)", "est": 20, "kind": "body", "why": "one short reason"}]}

Rules:
- 3 to 9 steps, ordered for energy: movement/hard focus early, admin in dips, real breaks between focus blocks.
- "est" is minutes (5-90). "kind" is exactly one of: body, self, focus, rest.
- Split any focus work longer than 60 minutes into ~50-minute blocks with a short rest between.
- Respect the speaker's stated energy level and available time; total should not exceed their available time.
- "why" is one concise sentence explaining the placement."""


@app.cls(
    image=image,
    gpu="L4",
    volumes={MODELS_DIR: volume},
    secrets=[modal.Secret.from_name("cadence-voice")],
    scaledown_window=300,          # stay warm 5 min after last request
    timeout=120,
    max_containers=1,              # one L4 is enough for the 14-user test phase
)
@modal.concurrent(max_inputs=16)   # vLLM batches these concurrently
class VoicePlanner:
    @modal.enter()
    def start(self):
        from faster_whisper import WhisperModel

        # Whisper shares the GPU; vLLM is told to leave room for it below.
        self.whisper = WhisperModel(
            WHISPER_MODEL,
            device="cuda",
            compute_type="int8_float16",
            download_root=os.path.join(MODELS_DIR, "whisper"),
        )

        self.vllm = subprocess.Popen([
            "vllm", "serve", LLM_MODEL,
            "--port", str(VLLM_PORT),
            "--max-model-len", "4096",
            "--gpu-memory-utilization", "0.78",
            "--disable-log-requests",
        ])
        deadline = time.time() + 600
        while time.time() < deadline:
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{VLLM_PORT}/health", timeout=2)
                return
            except Exception:
                if self.vllm.poll() is not None:
                    raise RuntimeError("vLLM exited during startup")
                time.sleep(2)
        raise RuntimeError("vLLM did not become healthy in time")

    @modal.exit()
    def stop(self):
        self.vllm.terminate()

    def _transcribe(self, audio_b64: str) -> str:
        raw = base64.b64decode(audio_b64)
        if len(raw) > MAX_AUDIO_BYTES:
            raise ValueError("audio too large")
        with tempfile.NamedTemporaryFile(suffix=".bin") as f:
            f.write(raw)
            f.flush()
            segments, _info = self.whisper.transcribe(f.name, vad_filter=True)
            return " ".join(s.text.strip() for s in segments).strip()

    def _generate_plan(self, transcript: str) -> dict:
        body = json.dumps({
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
            "temperature": 0.3,
            "max_tokens": 700,
        }).encode()
        req = urllib.request.Request(
            f"http://127.0.0.1:{VLLM_PORT}/v1/chat/completions",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            out = json.load(resp)
        text = out["choices"][0]["message"]["content"]
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("model returned no JSON")
        return json.loads(match.group(0))

    @modal.asgi_app()
    def api(self):
        from fastapi import FastAPI, HTTPException, Request

        web = FastAPI()

        @web.post("/plan")
        async def plan(request: Request):
            if request.headers.get("x-api-key") != os.environ["VOICE_API_KEY"]:
                raise HTTPException(status_code=401, detail="bad api key")

            payload = await request.json()
            transcript = (payload.get("text") or "").strip()
            try:
                if not transcript and payload.get("audio_b64"):
                    transcript = self._transcribe(payload["audio_b64"])
                if not transcript:
                    raise ValueError("no speech detected")
                raw_plan = self._generate_plan(transcript)
            except ValueError as e:
                raise HTTPException(status_code=422, detail=str(e))

            return {"transcript": transcript, "plan": raw_plan}

        @web.get("/healthz")
        async def healthz():
            return {"ok": True}

        return web


@app.local_entrypoint()
def main():
    download_weights.remote()
