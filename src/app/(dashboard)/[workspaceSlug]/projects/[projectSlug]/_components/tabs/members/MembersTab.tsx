"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import type { ProjectRole } from "@prisma/client";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

type Props = {
  projectId: string;
};

export function MembersTab({ projectId }: Props) {
  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading } = api.project.getMembers.useQuery(
    {
      projectId,
    },
  );

  const ROLE_LABELS: Record<ProjectRole, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
  };

  const ROLE_STYLES: Record<ProjectRole, string> = {
    OWNER:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    ADMIN:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    MEMBER:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  };

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
      {/* Membership list */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{members.length} members</p>
        <Input placeholder="Search…" className="h-8 w-48 text-xs" />
      </div>

      <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border">
        {members.map((m) => (
          <div
            key={m.user.name}
            className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
          >
            {/* Avatar */}
            <Avatar key={m.id} className="border-background h-7 w-7 border">
              <AvatarImage src={m.user.image ?? ""} />
              <AvatarFallback className="text-[8px]">
                {m.user.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="text-sm font-medium">{m.user.name}</p>
              <p className="text-muted-foreground text-xs">
                Joined {format(m.joinedAt, "MMMM d, yyyy")}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn("text-[10px]", ROLE_STYLES[m.role])}
            >
              {ROLE_LABELS[m.role]}
            </Badge>
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
                <DropdownMenuItem>Change role</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
