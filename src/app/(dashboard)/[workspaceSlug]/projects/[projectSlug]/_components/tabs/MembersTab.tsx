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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Send, Link2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

type Invite = {
  email: string;
  role: string;
  sent: string;
};

type Props = {
  projectId: string;
};

export function MembersTab({ projectId }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [pending, setPending] = useState<Invite[]>([
    { email: "dev@studio.io", role: "Member", sent: "2d ago" },
    { email: "design@agency.com", role: "Viewer", sent: "5d ago" },
  ]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data: members = [], isLoading } = api.project.getMembers.useQuery(
    {
      projectId,
    },
  );

  const handleInvite = () => {
    if (!email.trim()) return;
    setPending([{ email, role, sent: "just now" }, ...pending]);
    setEmail("");
  };

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
      {/* Invite form */}
      <div className="bg-card border-border rounded-xl border p-5">
        <p className="mb-1 text-sm font-medium">Invite by email</p>
        <p className="text-muted-foreground mb-4 text-xs">
          Send an invite to collaborate on this project.
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="h-9 flex-1 text-sm"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Member">Member</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleInvite}
            className="h-9 gap-1.5 text-xs"
          >
            <Send size={12} /> Send
          </Button>
        </div>
      </div>

      {/* Shareable link */}
      <div className="bg-card border-border flex items-center justify-between rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-md">
            <Link2 size={14} />
          </div>
          <div>
            <p className="text-sm font-medium">Shareable link</p>
            <p className="text-muted-foreground text-xs">
              Anyone with this link can request access
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          Copy link
        </Button>
      </div>

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

      {/* Pending invites */}
      {pending.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-[10px] font-medium tracking-widest uppercase">
            Pending
          </p>
          <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border">
            {pending.map((inv) => (
              <div
                key={inv.email}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="bg-muted border-border text-muted-foreground flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs">
                  {inv.email[0] ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-muted-foreground text-xs">
                    {inv.role} · {inv.sent}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                >
                  Pending
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-7 w-7"
                  onClick={() =>
                    setPending(pending.filter((p) => p.email !== inv.email))
                  }
                >
                  <X size={13} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
