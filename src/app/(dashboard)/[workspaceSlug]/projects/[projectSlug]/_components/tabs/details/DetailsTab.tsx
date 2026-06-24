"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Calendar, Clock, Target, TrendingUp, Check, Loader2, CalendarIcon } from "lucide-react";
import { Progress } from "~/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar as CalendarPicker } from "~/components/ui/calendar";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { ProjectData } from "~/types";
import { format } from "date-fns";
import { PROJECT_STATUS_OPTIONS, PRIORITY_OPTIONS } from "~/lib/constants/project-constants";
import { toSlug } from "~/lib/to-slug";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { ProjectStatus, Priority } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved";


// ─── SaveIndicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] transition-all duration-300",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {status === "saving" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Check size={10} />
      )}
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

// ─── DetailsTab ───────────────────────────────────────────────────────────────

export function DetailsTab({ project }: { project: ProjectData }) {
  // ── Editable state ───────────────────────────────────────────────────────
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [priority, setPriority] = useState<Priority>(project.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    project.dueDate ?? undefined,
  );
  const [editingDescription, setEditingDescription] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const descRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = api.useUtils();

  // ── Task counts ──────────────────────────────────────────────────────────
  const total = project.tasks.length;
  const open = project.tasks.filter((t) => t.status === "TODO").length;
  const inProgress = project.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inReview = project.tasks.filter((t) => t.status === "IN_REVIEW").length;
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // ── Update mutation ──────────────────────────────────────────────────────
  const update = api.project.update.useMutation({
    onMutate: () => {
      setSaveStatus("saving");
      window.dispatchEvent(new Event("project:saving"));
    },
    onSuccess: () => {
      setSaveStatus("saved");
      void utils.project.getProject.invalidate();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
    },
    onError: (err) => {
      setSaveStatus("idle");
      toast.error(err.message ?? "Failed to save");
    },
  });

  const scheduleSave = useCallback(
    (patch: {
      description?: string;
      status?: ProjectStatus;
      priority?: Priority;
      dueDate?: Date | undefined;
    }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        update.mutate({
          id: project.id,
          name: project.name,
          slug: toSlug(project.name),
          description: patch.description ?? description,
          status: patch.status ?? status,
          priority: patch.priority ?? priority,
          dueDate: patch.dueDate ?? dueDate,
        });
      }, 800);
    },
    [update, project.id, project.name, description, status, priority, dueDate],
  );

  // Save immediately (no debounce) for selects and date
  const saveNow = useCallback(
    (patch: {
      description?: string;
      status?: ProjectStatus;
      priority?: Priority;
      dueDate?: Date | undefined;
    }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      update.mutate({
        id: project.id,
        name: project.name,
        slug: toSlug(project.name),
        description: patch.description ?? description,
        status: patch.status ?? status,
        priority: patch.priority ?? priority,
        dueDate: patch.dueDate ?? patch.dueDate,
      });
    },
    [update, project.id, project.name, description, status, priority],
  );

  useEffect(() => {
    if (editingDescription) {
      descRef.current?.focus();
      const len = descRef.current?.value.length ?? 0;
      descRef.current?.setSelectionRange(len, len);
    }
  }, [editingDescription]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="grid grid-cols-[1fr_240px] gap-5">
      {/* Left */}
      <div className="flex flex-col gap-4">

        {/* About */}
        <div className="bg-card border-border rounded-xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              About
            </p>
            <SaveIndicator status={saveStatus} />
          </div>

          {editingDescription ? (
            <textarea
              ref={descRef}
              value={description}
              rows={4}
              onChange={(e) => {
                setDescription(e.target.value);
                scheduleSave({ description: e.target.value });
              }}
              onBlur={() => setEditingDescription(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingDescription(false);
              }}
              placeholder="Add a project description…"
              className={cn(
                "text-muted-foreground w-full resize-none bg-transparent text-sm leading-relaxed outline-none",
                "focus:bg-muted hover:bg-muted -ml-1.5 rounded px-1.5 py-1 transition-colors",
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className={cn(
                "hover:bg-muted -ml-1.5 w-full rounded px-1.5 py-1 text-left transition-colors",
                description
                  ? "text-muted-foreground text-sm leading-relaxed"
                  : "text-muted-foreground/40 text-sm italic",
              )}
            >
              {description || "Add a project description…"}
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="bg-card border-border rounded-xl border p-5">
          <p className="text-muted-foreground mb-4 text-[10px] font-medium tracking-widest uppercase">
            Progress
          </p>

          {total === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks yet.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {pct}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: open, label: "Open" },
                  { value: inProgress, label: "In progress" },
                  { value: inReview, label: "In review" },
                  { value: done, label: "Completed" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-muted flex flex-col gap-1 rounded-lg p-3"
                  >
                    <span className="text-xl font-medium tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-card border-border h-fit overflow-hidden rounded-xl border">
        <p className="text-muted-foreground border-border border-b px-4 py-3 text-[10px] font-medium tracking-widest uppercase">
          Details
        </p>

        {/* Start date — read only */}
        <div className="border-border flex items-center justify-between border-b px-4 py-2.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-2">
            <Calendar size={12} />
            Start
          </span>
          <span className="text-foreground">
            {format(project.createdAt, "MMM d, yyyy")}
          </span>
        </div>

        {/* Due date — editable */}
        <div className="border-border flex items-center justify-between border-b px-4 py-2.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-2">
            <Clock size={12} />
            Due
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "hover:text-foreground flex items-center gap-1 transition-colors",
                  dueDate ? "text-foreground" : "text-muted-foreground/50 italic",
                )}
              >
                <CalendarIcon size={11} />
                {dueDate ? format(dueDate, "MMM d, yyyy") : "Set date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date);
                  saveNow({ dueDate: date });
                }}
              />
              {dueDate && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 w-full text-xs"
                    onClick={() => {
                      setDueDate(undefined);
                      saveNow({ dueDate: undefined });
                    }}
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Priority — editable */}
        <div className="border-border flex items-center justify-between border-b px-4 py-2.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-2">
            <Target size={12} />
            Priority
          </span>
          <Select
            value={priority}
            onValueChange={(v) => {
              const val = v as Priority;
              setPriority(val);
              saveNow({ priority: val });
            }}
          >
            <SelectTrigger className="text-foreground h-auto w-auto border-none p-0 text-xs shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status — editable */}
        <div className="flex items-center justify-between px-4 py-2.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-2">
            <TrendingUp size={12} />
            Status
          </span>
          <Select
            value={status}
            onValueChange={(v) => {
              const val = v as ProjectStatus;
              setStatus(val);
              saveNow({ status: val });
            }}
          >
            <SelectTrigger className="text-foreground h-auto w-auto border-none p-0 text-xs shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PROJECT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}