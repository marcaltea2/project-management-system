"use client";

import { useState } from "react";
import { UserPlus, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import type { SelectedMember } from "~/types";

type Role = "MEMBER" | "ADMIN";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  workspaceId: string;
  existingMemberIds: string[];
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  existingMemberIds,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedMember | null>(null);
  const [role, setRole] = useState<Role>("MEMBER");

  const utils = api.useUtils();

  const { data: workspaceMembers = [], isLoading } =
    api.workspace.getMembers.useQuery(
      { workspaceId },
      { enabled: open },
    );

  const invite = api.project.inviteMember.useMutation({
    onMutate: () => window.dispatchEvent(new Event("project:saving")),
    onSuccess: () => {
      toast.success(`${selected?.name ?? "Member"} added to project`);
      void utils.project.getProject.invalidate();
      void utils.project.getMembers.invalidate({ projectId });
      handleClose();
    },
    onError: (err) => toast.error(err.message ?? "Failed to add member"),
  });

  // Filter out already-in-project members + apply search
  const filtered = workspaceMembers
    .filter((m) => !existingMemberIds.includes(m.userId))
    .filter((m) => {
      const q = search.toLowerCase();
      return (
        m.user?.name?.toLowerCase().includes(q) ??
        m.user?.email?.toLowerCase().includes(q)
      );
    });

  function handleClose() {
    setSelected(null);
    setRole("MEMBER");
    setSearch("");
    onOpenChange(false);
  }

  function handleInvite() {
    if (!selected) return;
    invite.mutate({ projectId, userId: selected.id, role });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <div className="border-border border-b px-5 pt-5 pb-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Add member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add someone from your workspace to this project.
            </DialogDescription>
          </DialogHeader>

          {/* Search + Role inline */}
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 flex-1 text-xs"
              autoFocus
            />
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">
                  <span className="text-xs">Member</span>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <span className="text-xs">Admin</span>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <span className="text-xs">Viewer</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Member list */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="text-muted-foreground animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-xs">
              {search ? "No members match your search." : "All workspace members are already in this project."}
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selected?.id === m.userId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setSelected(
                      isSelected
                        ? null
                        : {
                            id: m.userId,
                            name: m.user?.name ?? null,
                            image: m.user?.image ?? null,
                            email: m.user?.email ?? null,
                          },
                    )
                  }
                  className={cn(
                    "hover:bg-muted/50 flex w-full items-center gap-3 px-5 py-2.5 transition-colors",
                    isSelected && "bg-muted",
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={m.user?.image ?? ""} />
                    <AvatarFallback className="text-[9px]">
                      {m.user?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium">
                      {m.user?.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {m.user?.email}
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={13} className="text-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-5 py-3">
          <p className="text-muted-foreground text-[11px]">
            {selected ? (
              <>
                Adding{" "}
                <span className="text-foreground font-medium">
                  {selected.name}
                </span>{" "}
                as{" "}
                <span className="text-foreground font-medium">
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </span>
              </>
            ) : (
              "Select a member above"
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={!selected || invite.isPending}
              className="h-7 gap-1.5 text-xs"
            >
              {invite.isPending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <UserPlus size={11} />
              )}
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}