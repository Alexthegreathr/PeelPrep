"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Lightweight, dependency-free toasts. Wraps the authenticated app shell. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => remove(id), 3800);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon =
    toast.kind === "success"
      ? CircleCheck
      : toast.kind === "error"
        ? CircleAlert
        : Info;
  const accent =
    toast.kind === "success"
      ? "text-success"
      : toast.kind === "error"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg",
        "motion-safe:animate-[fade-up_.25s_ease-out]",
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", accent)}
        aria-hidden="true"
      />
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Access the toast API. Safe no-op if rendered outside the provider. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      success: () => {},
      error: () => {},
      info: () => {},
    }
  );
}
