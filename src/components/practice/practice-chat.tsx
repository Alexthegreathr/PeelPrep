"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Mic,
  Send,
  Square,
  Volume2,
  VolumeX,
  RotateCcw,
} from "lucide-react";

import {
  submitPracticeTurn,
  endPracticeSessionAction,
} from "@/app/(app)/interviews/[id]/practice/actions";
import { InterviewerAvatar } from "@/components/practice/interviewer-avatar";
import { getVoiceProvider, type SpeakHandle } from "@/lib/voice/provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PracticeTurnRow } from "@/lib/data/practice";

export function PracticeChat({
  interviewId,
  sessionId,
  turns,
  voiceAnswersAvailable,
  transcriptionIsMock,
}: {
  interviewId: string;
  sessionId: string;
  turns: PracticeTurnRow[];
  voiceAnswersAvailable: boolean;
  transcriptionIsMock: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Interviewer voice + avatar ─────────────────────────────────────────
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const speakHandle = useRef<SpeakHandle | null>(null);
  const spokenTurnId = useRef<string | null>(null);

  const last = turns[turns.length - 1];
  const awaitingAnswer = last?.role === "interviewer";

  // Keep the newest turn and the typing indicator in view.
  const bottomRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  function speak(content: string) {
    speakHandle.current?.cancel();
    setSpeaking(true);
    speakHandle.current = getVoiceProvider().speak(content, {
      onEnd: () => setSpeaking(false),
    });
  }

  // Auto-speak each new interviewer turn once, when voice is on.
  useEffect(() => {
    if (!voiceOn || !last || last.role !== "interviewer") return;
    if (spokenTurnId.current === last.id) return;
    spokenTurnId.current = last.id;
    speak(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id, voiceOn]);

  // Cancel any speech on unmount.
  useEffect(
    () => () => {
      speakHandle.current?.cancel();
      getVoiceProvider().cancel();
    },
    [],
  );

  function toggleVoice() {
    setVoiceOn((on) => {
      const next = !on;
      if (!next) {
        speakHandle.current?.cancel();
        getVoiceProvider().cancel();
        setSpeaking(false);
      }
      return next;
    });
  }

  // ── Voice answers (record → transcribe → review) ───────────────────────
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [mockNote, setMockNote] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const answerStreamRef = useRef<MediaStream | null>(null);

  async function startAnswerRecording() {
    setError(null);
    // Don't let the interviewer talk over the candidate.
    speakHandle.current?.cancel();
    getVoiceProvider().cancel();
    setSpeaking(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      answerStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        answerStreamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        void transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Couldn't access your microphone. Check browser permissions.");
    }
  }

  function stopAnswerRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    setMockNote(false);
    try {
      const form = new FormData();
      form.set("sessionId", sessionId);
      form.set("audio", blob, "answer.webm");
      const res = await fetch("/api/practice/transcribe", {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as {
        text?: string;
        isMock?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Transcription failed.");
        return;
      }
      setText((prev) =>
        prev ? `${prev} ${body.text ?? ""}` : (body.text ?? ""),
      );
      setMockNote(Boolean(body.isMock) && transcriptionIsMock);
    } catch {
      setError("Transcription failed. Please try again.");
    } finally {
      setTranscribing(false);
    }
  }

  useEffect(
    () => () => {
      answerStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  // ── Submit ─────────────────────────────────────────────────────────────
  function submit() {
    const value = text.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const res = await submitPracticeTurn(interviewId, sessionId, value);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setText("");
      setMockNote(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-secondary/40 p-3">
        <InterviewerAvatar speaking={speaking} />
        <div className="flex items-center gap-1">
          {awaitingAnswer ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => speak(last.content)}
              disabled={!voiceOn}
              aria-label="Replay the question"
            >
              <RotateCcw aria-hidden="true" /> Replay
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleVoice}
            aria-pressed={voiceOn}
          >
            {voiceOn ? (
              <Volume2 aria-hidden="true" />
            ) : (
              <VolumeX aria-hidden="true" />
            )}
            {voiceOn ? "Voice on" : "Voice off"}
          </Button>
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {turns.map((turn) => (
          <li
            key={turn.id}
            className={
              turn.role === "interviewer"
                ? "max-w-2xl rounded-2xl rounded-tl-sm bg-secondary px-4 py-3"
                : "max-w-2xl self-end rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-3"
            }
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {turn.role === "interviewer" ? "Interviewer" : "You"}
            </p>
            <p className="whitespace-pre-wrap text-sm">{turn.content}</p>
          </li>
        ))}
        {pending ? (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            The interviewer is responding…
          </li>
        ) : null}
        <li ref={bottomRef} aria-hidden="true" />
      </ol>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {awaitingAnswer ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <Textarea
            id="answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              last?.turn_type === "wrapup"
                ? "Ask your questions for the interviewer…"
                : "Type your answer, or use the mic to answer out loud…"
            }
            rows={5}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
          {mockNote ? (
            <p className="text-xs text-muted-foreground">
              Demo build: this is a mock transcript (not your actual words).
              Edit it before sending. A real speech-to-text provider transcribes
              your audio in production.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {voiceAnswersAvailable ? (
                recording ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stopAnswerRecording}
                  >
                    <Square aria-hidden="true" /> Stop
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startAnswerRecording}
                    disabled={transcribing || pending}
                  >
                    {transcribing ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Mic aria-hidden="true" />
                    )}
                    {transcribing ? "Transcribing…" : "Answer by voice"}
                  </Button>
                )
              ) : (
                <span className="text-xs text-muted-foreground">
                  Enable mic + media-upload consent in{" "}
                  <Link className="underline" href="/settings">
                    Settings
                  </Link>{" "}
                  to answer by voice.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                  >
                    End session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You won&apos;t be able to add more answers. You&apos;ll
                      get your feedback and can review the full session
                      afterward.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep going</AlertDialogCancel>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await endPracticeSessionAction(
                            interviewId,
                            sessionId,
                          );
                          router.refresh();
                        })
                      }
                    >
                      End practice session
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                onClick={submit}
                disabled={pending || !text.trim()}
              >
                {pending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send aria-hidden="true" />
                )}
                Send
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Feedback comes at the end — focus on answering naturally. ⌘/Ctrl +
            Enter to send.
          </p>
        </div>
      ) : null}
    </div>
  );
}
