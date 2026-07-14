# Phase 14 — Avatar-led practice + landmark-backed delivery report

> **Status: design (docs only).** Per the working process, no feature code is
> written until this design is approved. This phase moves the practice
> experience from "typed chat" toward "feels like a live interview," and finally
> wires in the on-device landmark model that Phase 8B (VDA) left as a stub.

## 1. Goal & the decisions this encodes

Make a mock interview feel live — a talking, animated AI interviewer you can
answer out loud — and give richer body-language/delivery feedback afterward,
**without crossing the app's permanent ethical boundaries**.

Approved product decisions (owner):

| Decision | Choice |
| --- | --- |
| Camera/body-language framing | Observable cues **+ a neutral "presence" summary** (no confidence/emotion claim) |
| Avatar fidelity | **Animated / lip-synced** generic avatar (never the real interviewer) |
| Candidate answering | **Typed or voice, chosen per session** (voice reuses the VDA transcription seam) |
| Timing | **Enhanced post-session first** — live-feeling mock, analysis runs after on the recording |

## 2. What stays permanently out of scope (unchanged from spec)

This phase changes none of the hard prohibitions. Restated so they are not
eroded by "presence summary" or "feels live":

- **No emotion, confidence, nervousness, personality, deception, or
  psychological inference.** PRODUCT_SPEC forbids claiming a user "lacks
  confidence" or "is nervous"; emotion detection and psychological analysis are
  permanently out of scope. The presence summary (§4) is a rollup of
  **observable measurements only** and is never a confidence/affect score.
- **No facial or identity recognition; no biometric identity templates.**
- **No likeness of the real interviewer.** The avatar is always a generic,
  clearly-synthetic persona. No real person's face or voice is generated.
- **No raw video or landmark frames leave the browser.** Only Zod-validated
  aggregate numbers (and, on opt-in, a transcript) are submitted.
- **Zero readiness weight.** Readiness output stays byte-identical with and
  without any Phase 14 activity.

The Phase 8B **prohibited-claims linter** remains the backstop and is extended
to cover the presence-summary vocabulary (§4, §7).

## 3. The three capabilities

### 3a. Animated avatar interviewer (generic, synthetic)

- A generic interviewer portrait with **audio-driven lip/mouth animation** — the
  mouth/visage animates from the spoken audio's amplitude envelope, computed in
  the browser. No photoreal deepfake; no real-person likeness.
- Interviewer turns are **spoken aloud** via a `VoiceProvider` abstraction, same
  mock-first pattern as `AiProvider` / `TranscriptionProvider`:
  - **mock (default):** browser `speechSynthesis` — free, on-device, offline,
    deterministic voice selection. A genuinely working voice, not a stub.
  - **real (integration point):** a neural-TTS vendor behind the same interface,
    key-gated, documented — never enabled silently.
- A clearly-labeled "AI interviewer — synthetic voice & avatar" affordance so the
  user is never misled into thinking it's a recording of a real person.

### 3b. Voice or typed answers (per session)

- Session config gains an answer modality: `typed` (today's proven flow, default)
  or `voice`. Reuses the existing `modality` column on `practice_sessions`.
- **Voice** captures the candidate's answer with `MediaRecorder` and transcribes
  it via the existing Phase 8B `TranscriptionProvider` (mock deterministic; real
  STT as the documented integration point). The transcript is the answer text
  that flows into the *existing* answer-evaluation task — no new AI task needed
  for the answer itself.
- Declining mic / voice always leaves typed practice fully functional (spec
  invariant). Voice requires the existing `vda_microphone` (capture) and, for
  transcription, `vda_media_upload` consents — no new consent types.

### 3c. Landmark-backed delivery report + presence summary (post-session)

- Because analysis is **post-session**, we process the saved/last recording after
  the mock — no real-time 30fps overlay, so perf risk is low and it matches the
  proven VDA pipeline.
- Wire in the **on-device face/pose landmark model** (MediaPipe Tasks / WASM in a
  Web Worker) that Phase 8B documented but stubbed. It now populates the video
  metrics that VDA currently submits as `null`: `camera_facing_pct`,
  `frame_centering_pct`, `posture_stability_score`, `shoulder_angle_variation_deg`,
  `movement_events_per_min`, `sample_coverage_pct`. All aggregates; raw frames
  never leave the worker.
- The `delivery_feedback` AI task and its guardrail/linter are unchanged; it now
  simply receives real (rather than null) video metrics, with `missing_measurements`
  shrinking accordingly.

## 4. The "presence summary" — definition & guardrails

A neutral rollup shown above the detailed metrics. **It is a summary of
observable measurements, not a judgment of the person.**

- Built purely from the already-allowed observable aggregates (framing,
  camera-facing time, posture stability, movement, pace, pauses, filler rate).
- Each line is a measurement + a neutral band tied to that measurement — e.g.
  "In frame 92% of the answer," "Speaking pace ~150 wpm (measured)," "Shoulder
  movement: low variation." **Banned vocabulary:** no confidence/nervous/calm/
  tense/anxious/relaxed or any affect word; bands describe the *measurement*
  (e.g. "low/high movement," "in/out of frame"), never an inner state.
- A fixed, prominent disclaimer: *"A snapshot of observable delivery
  measurements — not a measure of confidence, emotion, or personality."*
- The presence summary is **generated deterministically from the metric numbers**
  (a pure function, like the readiness calculator) — it does **not** ask the AI
  to characterize the person — and it is still run through the prohibited-claims
  linter (extended with the affect wordlist above) as a defense-in-depth check.

## 5. Architecture (reuses existing seams)

```
browser                                            server / providers
─────────────────────────────────────────────     ─────────────────────────────
interviewer turn text ─► VoiceProvider (mock:      practice turn (existing)
  speechSynthesis) ─► audio ─► amplitude envelope
  ─► avatar lip animation (canvas/SVG)
candidate answer:
  ├─ typed ───────────────────────────────────►    answer_evaluation (existing task)
  └─ voice ─► MediaRecorder ─► TranscriptionProvider ► transcript ► answer_evaluation
post-session recording:
  └─ landmark worker (WASM) ─► aggregate video ──►  delivery_metrics (Phase 8B tables)
     metrics (no frames leave the tab)               ├─ presence summary (pure fn)
                                                      └─ delivery_feedback (existing task + linter)
```

New provider abstraction: `VoiceProvider` (`src/lib/voice/…`), mirroring
`TranscriptionProvider`. New browser modules: landmark worker + avatar animator.
No new AI task; no new consent types; existing usage-ledger features.

## 6. Data model

Minimal — the schema already reserved most of this:

- `practice_sessions.modality` — already exists; used to pick typed/voice.
- Reuse Phase 8B `media_assets` / `transcripts` / `delivery_analyses` /
  `delivery_metrics` / `processing_jobs` unchanged.
- Possibly add `delivery_analyses.presence_summary jsonb` (deterministic rollup)
  — or compute on read. Decide at implementation; leaning stored for export/history.
- No new biometric columns, ever.

## 7. Plan gating & metering

- **Avatar + voice mock interview:** proposed available to all plans (it's an
  experience upgrade, mock-first, no marginal AI cost with `speechSynthesis`).
  Real TTS/STT vendors, when enabled, are per-minute costs → metered like
  `transcription`.
- **Landmark-backed delivery report + presence summary:** stays **Pro-only**,
  consistent with Phase 8B `delivery_feedback` gating.
- (Open decision for approval — see §10.)

## 8. Privacy & consent

- Same five VDA consents, reused; **no new consent types**. Voice answers need
  `vda_microphone` (+ `vda_media_upload` for transcription).
- Landmark inference is on-device in a worker; **no frames or biometric data
  leave the browser**; only aggregates submitted.
- Avatar/voice generation is client-side in mock mode; if a real vendor is
  enabled, only the interviewer's *question text* is sent (never the user's
  private answer/résumé), and that is disclosed.
- Per-artifact deletion, retention sweeper, and export all extend the existing
  Phase 8B flows.

## 9. Testing (mock-first, CI-headless)

- Unit: presence-summary pure function (band boundaries; never emits affect
  words); voice-provider mock; landmark aggregation math on a fixture stream.
- Extend the prohibited-claims linter dictionary + tests with the affect wordlist.
- Integration: voice answer → transcript → answer_evaluation; landmark metrics
  populate `delivery_metrics`; presence summary generated; **zero readiness
  weight byte-identical**; Pro gating.
- E2E (fake camera/mic + `speechSynthesis`): run a spoken mock, answer by voice
  and by typing, get the post-session report; **network assertion: no raw video
  or landmark frames on the wire**.

## 10. Open decisions for approval

1. **Plan gating** (§7): avatar/voice free for all, delivery report Pro-only — OK?
2. **Landmark model host:** self-host MediaPipe WASM assets (privacy, larger
   bundle) vs. document as a config'd asset URL. Recommend self-host.
3. **`presence_summary` storage** (§6): store vs compute-on-read. Recommend store.
4. Scope check: this is **one phase** (avatar + voice + post-session report).
   Fully-live real-time cue overlay remains a **later** phase.

## 11. Non-goals (this phase)

Real-time live cue overlay during the answer; photoreal talking-head video;
real-interviewer likeness; any emotion/confidence/personality inference;
readiness impact; recording sharing or third-party review; model training on
recordings.
