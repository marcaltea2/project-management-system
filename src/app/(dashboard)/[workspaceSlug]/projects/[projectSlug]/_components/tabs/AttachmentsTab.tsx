"use client";

import { Upload, MoreHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { getFileIcon } from "~/lib/helper/get-file-icon";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

type Props = {
  projectId: string;
};

export function AttachmentsTab({ projectId }: Props) {
  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data: attachments = [], isLoading } =
    api.project.getAttachments.useQuery({
      projectId,
    });

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Upload zone */}
      <div className="border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors">
        <Upload size={18} className="text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Drop files here or{" "}
          <span className="text-foreground cursor-pointer underline underline-offset-2">
            browse
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          PDF, images, docs up to 50MB
        </p>
      </div>

      {/* File list */}
      {attachments.length === 0 ? (
        <div className="bg-card border-border text-muted-foreground rounded-xl border p-8 text-center text-sm">
          No attachments yet
        </div>
      ) : (
        <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border">
          {attachments.map((f) => (
            <div
              key={f.id}
              className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <div className="bg-muted border-border text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border">
                {getFileIcon(f.filename)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.filename}</p>
                <p className="text-muted-foreground text-xs">
                  {(f.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground h-7 w-7"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
