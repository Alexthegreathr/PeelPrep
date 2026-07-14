"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type PaletteInterview = {
  id: string;
  company_name: string | null;
  position_title: string | null;
};

type Item = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon: React.ReactNode;
  group: "Go to" | "Interviews";
};

const NAV: Item[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
    group: "Go to",
  },
  {
    id: "new",
    label: "New interview",
    href: "/interviews/new",
    icon: <Plus className="size-4" aria-hidden="true" />,
    group: "Go to",
  },
  {
    id: "history",
    label: "All interviews",
    href: "/history",
    icon: <Briefcase className="size-4" aria-hidden="true" />,
    group: "Go to",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    icon: <UserRound className="size-4" aria-hidden="true" />,
    group: "Go to",
  },
  {
    id: "billing",
    label: "Billing & plan",
    href: "/billing",
    icon: <CreditCard className="size-4" aria-hidden="true" />,
    group: "Go to",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: <Settings className="size-4" aria-hidden="true" />,
    group: "Go to",
  },
];

/** ⌘K / Ctrl-K command palette for fast navigation. Also opens on the custom
 *  `open-command-palette` window event (dispatched by the sidebar trigger). */
export function CommandPalette({
  interviews,
}: {
  interviews: PaletteInterview[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const interviewItems: Item[] = interviews.map((i) => ({
      id: `iv-${i.id}`,
      label: i.company_name || "Untitled interview",
      sub: i.position_title || undefined,
      href: `/interviews/${i.id}`,
      icon: <Briefcase className="size-4" aria-hidden="true" />,
      group: "Interviews",
    }));
    return [...NAV, ...interviewItems];
  }, [interviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      `${it.label} ${it.sub ?? ""}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const select = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      close();
      router.push(item.href);
    },
    [close, router],
  );

  // Global open shortcut + custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  // Focus the input when opened.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(filtered[active]);
    }
  };

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-foreground/40 p-4 pt-[12vh] backdrop-blur-sm motion-safe:animate-[fade-in_.15s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border bg-popover shadow-2xl motion-safe:animate-[fade-up_.18s_ease-out]"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search interviews and pages…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
          <kbd className="hidden rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches.
            </p>
          ) : (
            filtered.map((item, i) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {showGroup ? (
                    <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                      i === active
                        ? "bg-secondary text-foreground"
                        : "text-foreground/80",
                    )}
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      {item.sub ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.sub}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/** A sidebar/header button that opens the palette. */
export function CommandTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="rounded border border-sidebar-border/60 px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
