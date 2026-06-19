import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import type { SelectedMember,  WorkspaceMember } from "~/types";

type MemberComboboxProps = {
  workspaceMembers: WorkspaceMember[];
  selectedIds: string[];
  onSelect: (member: SelectedMember) => void;
};

export function MemberCombobox({
  workspaceMembers,
  selectedIds,
  onSelect,
}: MemberComboboxProps) {
  return (
    <Command>
      <CommandInput placeholder="Search members..." />

      <CommandList>
        <CommandEmpty>No members found.</CommandEmpty>

        <CommandGroup>
          {workspaceMembers
            .filter((m) => !selectedIds.includes(m.userId))
            .map((m) => (
              <CommandItem
                key={m.id}
                onSelect={() =>
                  onSelect({
                    id: m.userId,
                    name: m.user?.name ?? null,
                    image: m.user?.image ?? null,
                    email: m.user?.email ?? null,
                  })
                }
              >
                <Avatar className="mr-2 h-6 w-6">
                  <AvatarImage src={m.user?.image ?? ""} />
                  <AvatarFallback className="text-[8px]">
                    {m.user?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <span className="text-sm">{m.user?.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {m.user?.email}
                  </span>
                </div>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}