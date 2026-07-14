"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import {
  toggleChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
} from "@/app/(app)/interviews/[id]/readiness/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChecklistItem } from "@/lib/data/checklist";

export function ChecklistCard({
  interviewId,
  checklistId,
  items,
}: {
  interviewId: string;
  checklistId: string;
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const done = items.filter((i) => i.completed_at).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {done} of {items.length} done
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(item.completed_at)}
              onChange={(e) =>
                startTransition(() => {
                  void toggleChecklistItem(
                    interviewId,
                    item.id,
                    e.target.checked,
                  );
                  router.refresh();
                })
              }
              className="size-4 shrink-0 rounded border-input accent-success"
              aria-label={item.label}
            />
            <span
              className={
                "flex-1 text-sm " +
                (item.completed_at ? "text-muted-foreground line-through" : "")
              }
            >
              {item.label}
            </span>
            {item.source === "user_added" ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    void deleteChecklistItem(interviewId, item.id);
                    router.refresh();
                  })
                }
                aria-label="Remove item"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        action={() => {
          const label = newLabel;
          setNewLabel("");
          startTransition(() => {
            void addChecklistItem(interviewId, checklistId, label);
            router.refresh();
          });
        }}
      >
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add your own item…"
          maxLength={300}
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={!newLabel.trim()}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </form>
    </div>
  );
}
