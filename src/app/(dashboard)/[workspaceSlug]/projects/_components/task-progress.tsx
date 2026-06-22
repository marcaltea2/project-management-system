"use client"

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { ProjectListItem } from "~/types";
import { cn } from "~/lib/utils";

export function TaskProgress({ tasks }: { tasks: ProjectListItem["tasks"] }) {
  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === "DONE").length ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (total === 0) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-2">
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  pct === 100
                    ? "bg-emerald-500"
                    : pct >= 60
                      ? "bg-blue-500"
                      : "bg-amber-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {done}/{total}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {pct}% complete · {total - done} remaining
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
