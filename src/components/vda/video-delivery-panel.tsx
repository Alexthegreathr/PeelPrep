"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Circle,
  Loader2,
  Lock,
  ShieldCheck,
  Square,
  Trash2,
  Video,
} from "lucide-react";

import {
  submitDeliveryMetrics,
  deleteAnalysis,
  deleteTranscript,
  deleteRecording,
  type VdaResult,
} from "@/app/(app)/interviews/[id]/practice/[sessionId]/vda-actions";
import { computeAudioAggregates } from "@/components/vda/audio-metrics";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { DeliveryAnalysisView } from "@/lib/data/vda";

const MAX_SECONDS = 180; // 3-minute cap (mirrors the upload route)

type VdaConsents = {
  vda_camera: boolean;
  vda_microphone: boolean;
  vda_recording: boolean;
  vda_media_upload: boolean;
  vda_ai_analysis: boolean;
};

type Feedback = {
  observable_strengths?: string[];
  delivery_observations?: string[];
  top_improvement?: string;
  camera_setup_advice?: string;
  speaking_advice?: string;
  practice_exercise?: string;
  uncertainty_and_limitations?: string;
};

const METRIC_LABELS: Record<string, string> = {
  answer_duration_seconds: "Answer length (s)",
  pause_count: "Pauses",
  avg_pause_ms: "Average pause (ms)",
  longest_pause_ms: "Longest pause (ms)",
  volume_variation_coeff: "Volume variation",
  speaking_pace_wpm: "Speaking pace (wpm)",
  filler_word_count: "Filler words",
  filler_words_per_100: "Fillers / 100 words",
  camera_facing_pct: "Camera-facing (%)",
  frame_centering_pct: "Framing centered (%)",
  posture_stability_score: "Posture stability",
  sample_coverage_pct: "Landmark coverage (%)",
};

export function VideoDeliveryPanel({
  interviewId,
  sessionId,
  isPro,
  consents,
  analyses,
  transcriptionIsMock,
}: {
  interviewId: string;
  sessionId: string;
  isPro: boolean;
  consents: VdaConsents;
  analyses: DeliveryAnalysisView[];
  transcriptionIsMock: boolean;
}) {
  if (!isPro) {
    return (
      <SectionShell>
        <Alert>
          <AlertDescription>
            <p className="flex items-center gap-2">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              Video Delivery Analysis is a Pro feature. It gives optional,
              observational feedback on delivery habits (pacing, pauses,
              framing) from measurements computed on your device.
            </p>
            <p className="mt-2">
              <Link className="font-medium underline" href="/billing">
                Upgrade to Pro
              </Link>{" "}
              to enable it.
            </p>
          </AlertDescription>
        </Alert>
        {analyses.length > 0 ? (
          <ExistingReports
            interviewId={interviewId}
            sessionId={sessionId}
            analyses={analyses}
            transcriptionIsMock={transcriptionIsMock}
          />
        ) : null}
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <Recorder
        interviewId={interviewId}
        sessionId={sessionId}
        consents={consents}
        transcriptionIsMock={transcriptionIsMock}
      />
      <ExistingReports
        interviewId={interviewId}
        sessionId={sessionId}
        analyses={analyses}
        transcriptionIsMock={transcriptionIsMock}
      />
    </SectionShell>
  );
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Video className="size-5" aria-hidden="true" /> Video Delivery
          Analysis
          <Badge variant="secondary">Optional</Badge>
        </CardTitle>
        <CardDescription>
          Practice your spoken delivery. Measurements are computed on your
          device; only aggregate numbers are sent for feedback. This never
          scores your readiness, and never infers emotion, personality, or
          truthfulness.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6">{children}</CardContent>
    </Card>
  );
}

type RecState = "idle" | "previewing" | "recording" | "recorded" | "analyzing";

function Recorder({
  interviewId,
  sessionId,
  consents,
  transcriptionIsMock,
}: {
  interviewId: string;
  sessionId: string;
  consents: VdaConsents;
  transcriptionIsMock: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<RecState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [allowTranscription, setAllowTranscription] = useState(false);
  const [result, setResult] = useState<VdaResult | null>(null);

  const missingConsents = requiredConsents(consents);
  const canRecord = missingConsents.length === 0;

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopStream();
      if (tickRef.current) clearInterval(tickRef.current);
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startPreview() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setState("previewing");
    } catch {
      setError(
        "Couldn't access your camera and microphone. Check your browser permissions and try again.",
      );
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mime ? { mimeType: mime } : undefined,
    );
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mime || "video/webm",
      });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPlaybackUrl(url);
      setState("recorded");
    };
    recorder.start();
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    setElapsed(0);
    setState("recording");
    tickRef.current = setInterval(() => {
      const secs = (performance.now() - startedAtRef.current) / 1000;
      setElapsed(secs);
      if (secs >= MAX_SECONDS) stopRecording();
    }, 250);
  }

  function stopRecording() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    stopStream();
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function reset() {
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    setPlaybackUrl(null);
    setRecordedBlob(null);
    setResult(null);
    setElapsed(0);
    setState("idle");
  }

  async function analyze() {
    if (!recordedBlob) return;
    setState("analyzing");
    setError(null);
    setResult(null);
    try {
      const audio = await computeAudioAggregates(recordedBlob, elapsed);
      // Video-derived metrics require an on-device landmark model, which isn't
      // loaded in this build — submit them as unmeasured (null) so the report
      // is transparent about coverage rather than inventing values.
      const metrics = {
        ...audio,
        camera_facing_pct: null,
        frame_centering_pct: null,
        head_turns_per_min: null,
        posture_stability_score: null,
        shoulder_angle_variation_deg: null,
        movement_events_per_min: null,
        sample_coverage_pct: null,
        lighting_flag: false,
        framing_flag: false,
      };
      const res = await submitDeliveryMetrics(interviewId, sessionId, {
        metrics,
        coachingGoals: [],
        allowTranscription: allowTranscription && consents.vda_media_upload,
        answerHint: null,
        mediaAssetId: null,
      });
      setResult(res);
      if (res.ok) {
        reset();
        router.refresh();
      } else {
        setState("recorded");
      }
    } catch {
      setError("Analysis failed. Please try again.");
      setState("recorded");
    }
  }

  if (!canRecord) {
    return (
      <Alert>
        <AlertDescription>
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            To record and analyze delivery, enable these consents in{" "}
            <Link className="font-medium underline" href="/settings">
              Settings
            </Link>
            :
          </p>
          <ul className="mt-2 list-disc pl-6 text-sm">
            {missingConsents.map((c) => (
              <li key={c}>{CONSENT_LABELS[c]}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{result.message}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="relative overflow-hidden rounded-xl border bg-black">
        <video
          ref={videoRef}
          playsInline
          controls={state === "recorded"}
          src={state === "recorded" && playbackUrl ? playbackUrl : undefined}
          className="aspect-video w-full bg-black object-contain"
        />
        {state === "recording" ? (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            <Circle
              className="size-3 animate-pulse fill-red-500 text-red-500"
              aria-hidden="true"
            />
            {formatTime(elapsed)} / {formatTime(MAX_SECONDS)}
          </div>
        ) : null}
        {state === "idle" ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Camera off
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" ? (
          <Button type="button" onClick={startPreview}>
            <Video aria-hidden="true" /> Turn on camera
          </Button>
        ) : null}
        {state === "previewing" ? (
          <>
            <Button type="button" onClick={startRecording}>
              <Circle aria-hidden="true" /> Start recording
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopStream();
                if (videoRef.current) videoRef.current.srcObject = null;
                setState("idle");
              }}
            >
              Cancel
            </Button>
          </>
        ) : null}
        {state === "recording" ? (
          <Button type="button" variant="outline" onClick={stopRecording}>
            <Square aria-hidden="true" /> Stop
          </Button>
        ) : null}
        {state === "recorded" ? (
          <>
            <Button type="button" onClick={analyze}>
              Analyze delivery
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Discard &amp; re-record
            </Button>
          </>
        ) : null}
        {state === "analyzing" ? (
          <Button type="button" disabled>
            <Loader2 className="animate-spin" aria-hidden="true" /> Analyzing…
          </Button>
        ) : null}
      </div>

      {state === "recorded" && consents.vda_media_upload ? (
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allowTranscription}
            onChange={(e) => setAllowTranscription(e.target.checked)}
            className="mt-0.5 size-4 rounded border-input accent-[#4d7b55]"
          />
          <span>
            Generate a private transcript for speaking-pace and filler-word
            feedback.{" "}
            {transcriptionIsMock ? (
              <span className="font-medium">
                (Demo build: uses a mock transcript, not your audio.)
              </span>
            ) : null}{" "}
            It is auto-deleted after processing and you can delete it anytime.
          </span>
        </label>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Your recording stays in this browser tab. Only computed aggregate
        numbers (and, if you opt in, a transcript) are uploaded — never the
        video or audio itself.
      </p>
    </div>
  );
}

function ExistingReports({
  interviewId,
  sessionId,
  analyses,
  transcriptionIsMock,
}: {
  interviewId: string;
  sessionId: string;
  analyses: DeliveryAnalysisView[];
  transcriptionIsMock: boolean;
}) {
  if (analyses.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Your delivery reports</h3>
      {analyses.map((a) => (
        <DeliveryReport
          key={a.id}
          interviewId={interviewId}
          sessionId={sessionId}
          analysis={a}
          transcriptionIsMock={transcriptionIsMock}
        />
      ))}
    </div>
  );
}

function DeliveryReport({
  interviewId,
  sessionId,
  analysis,
  transcriptionIsMock,
}: {
  interviewId: string;
  sessionId: string;
  analysis: DeliveryAnalysisView;
  transcriptionIsMock: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const feedback = (analysis.feedback ?? {}) as Feedback;
  const metrics = analysis.delivery_metrics[0] ?? null;

  const measured = metrics
    ? Object.entries(METRIC_LABELS)
        .map(([key, label]) => [label, metrics[key]] as const)
        .filter(([, v]) => v != null)
    : [];

  function remove(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(analysis.status)}>
            {statusLabel(analysis.status)}
          </Badge>
          {analysis.transcript_id ? (
            <Badge variant="outline">
              {transcriptionIsMock ? "Mock transcript" : "Transcript"}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            remove(() => deleteAnalysis(interviewId, sessionId, analysis.id))
          }
          className="text-destructive hover:text-destructive"
        >
          <Trash2 aria-hidden="true" /> Delete report
        </Button>
      </div>

      {feedback.uncertainty_and_limitations ||
      analysis.missing_measurements.length ? (
        <Alert className="mb-3">
          <AlertDescription>
            {feedback.uncertainty_and_limitations ? (
              <p>{feedback.uncertainty_and_limitations}</p>
            ) : null}
            {analysis.missing_measurements.length ? (
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {analysis.missing_measurements.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {analysis.status === "partial" && !feedback.top_improvement ? (
        <p className="text-sm text-muted-foreground">
          Measurements were recorded, but AI coaching couldn&apos;t be generated
          for this attempt (no usage was charged). You can try again.
        </p>
      ) : null}

      {feedback.observable_strengths?.length ? (
        <ReportList
          title="What went well"
          items={feedback.observable_strengths}
        />
      ) : null}
      {feedback.delivery_observations?.length ? (
        <ReportList
          title="Delivery observations"
          items={feedback.delivery_observations}
        />
      ) : null}
      {feedback.top_improvement ? (
        <ReportBlock
          title="Top thing to try next"
          body={feedback.top_improvement}
        />
      ) : null}
      {feedback.speaking_advice ? (
        <ReportBlock title="Speaking" body={feedback.speaking_advice} />
      ) : null}
      {feedback.camera_setup_advice ? (
        <ReportBlock
          title="Camera & framing"
          body={feedback.camera_setup_advice}
        />
      ) : null}
      {feedback.practice_exercise ? (
        <ReportBlock
          title="Practice exercise"
          body={feedback.practice_exercise}
        />
      ) : null}

      {measured.length ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Measurements
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {measured.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {(analysis.transcript_id || analysis.media_asset_id) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {analysis.transcript_id ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                remove(() =>
                  deleteTranscript(
                    interviewId,
                    sessionId,
                    analysis.transcript_id as string,
                  ),
                )
              }
            >
              <Trash2 aria-hidden="true" /> Delete transcript
            </Button>
          ) : null}
          {analysis.media_asset_id ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                remove(() =>
                  deleteRecording(
                    interviewId,
                    sessionId,
                    analysis.media_asset_id as string,
                  ),
                )
              }
            >
              <Trash2 aria-hidden="true" /> Delete recording
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-2">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function ReportBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────
const CONSENT_LABELS: Record<keyof VdaConsents, string> = {
  vda_camera: "Camera access",
  vda_microphone: "Microphone access",
  vda_recording: "Record practice answers",
  vda_media_upload: "Upload media for transcription",
  vda_ai_analysis: "AI delivery feedback",
};

function requiredConsents(consents: VdaConsents): (keyof VdaConsents)[] {
  const needed: (keyof VdaConsents)[] = [
    "vda_camera",
    "vda_microphone",
    "vda_recording",
    "vda_ai_analysis",
  ];
  return needed.filter((c) => !consents[c]);
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "feedback_ready":
      return "Feedback ready";
    case "partial":
      return "Measurements only";
    case "metrics_ready":
      return "Measurements only";
    default:
      return "Processing";
  }
}

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "feedback_ready") return "default";
  if (status === "partial") return "outline";
  return "secondary";
}
