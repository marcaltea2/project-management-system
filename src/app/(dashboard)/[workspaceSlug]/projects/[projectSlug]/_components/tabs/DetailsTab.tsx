"use client";

import { Calendar, Clock, Target, TrendingUp, Edit3 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import type { ProjectData } from "~/types";
import { format } from "date-fns";
import {
  PROJECT_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "~/lib/project-options";

export function DetailsTab({ project }: { project: ProjectData }) {
  return (
    <div className="grid grid-cols-[1fr_220px] gap-5">
      {/* Left */}
      <div className="flex flex-col gap-4">
        {/* About */}
        <div className="bg-card border-border rounded-xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              About
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 gap-1.5 px-2 text-xs"
            >
              <Edit3 size={12} /> Edit
            </Button>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {project?.description}
          </p>
        </div>

        {/* Progress */}
        <div className="bg-card border-border rounded-xl border p-5">
          <p className="text-muted-foreground mb-4 text-[10px] font-medium tracking-widest uppercase">
            Progress
          </p>
          <div className="mb-4 flex items-center gap-3">
            <Progress value={68} className="h-1.5 flex-1" />
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              68%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "24", label: "Open" },
              { value: "8", label: "In progress" },
              { value: "41", label: "Completed" },
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
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-card border-border h-fit overflow-hidden rounded-xl border">
        <p className="text-muted-foreground border-border border-b px-4 py-3 text-[10px] font-medium tracking-widest uppercase">
          Details
        </p>
        {[
          {
            icon: <Calendar size={12} />,
            label: "Start",
            value: format(project.createdAt, "MMMM d, yyyy"),
          },
          {
            icon: <Clock size={12} />,
            label: "Due",
            value: project.dueDate
              ? format(project.dueDate, "MMMM d, yyyy")
              : "-",
          },
          {
            icon: <Target size={12} />,
            label: "Priority",
            value: PRIORITY_OPTIONS.find((p) => p.value === project.priority)?.label ?? project.priority,
            valueClass: "text-red-500",
          },
          {
            icon: <TrendingUp size={12} />,
            label: "Status",
            value: PROJECT_STATUS_OPTIONS.find((s) => s.value === project.status)?.label ?? project.status,
            valueClass: "text-emerald-500",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="border-border flex items-center justify-between border-b px-4 py-2.5 text-xs last:border-0"
          >
            <span className="text-muted-foreground flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
            <span className={item.valueClass ?? "text-foreground"}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
